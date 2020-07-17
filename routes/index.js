//Expense Tracker Dashboard
//Author : Jacob Amaral
//HOW TO SETUP:
//1.) Download a .csv of your personal bank transactions
//2.) Save .csv in root directory if this project and call it purchases.csv
//3.) Make sure purchases.csv is formatted like so : date, name of transaction, withdraw $, deposit $, account size $
'use strict';
var express = require('express');
var router = express.Router();
var moment = require('moment');
const csv = require('csv-parser')
const fs = require('fs')
var timeseries = require("timeseries-analysis")
/*Homepage Dashboard*/
router.get('/', function (req, res) {
    //Reset vars
    var expensesStartOfMonth = 0.00;
    var incomeStartOfMonth = 0.00;
    var expensesLastMonth = 0.00;
    var incomeLastMonth = 0.00;
    var biggestExpense = 0.00;
    var results = [];
    var allData = {};
    var biggestExpenseName = '';
    var timeSeriesExpenses = [];
    var timeSeriesDates = [];
    var expenseCategories = ['Groceries', 'Fitness', 'Transportation', 'Rent', 'Fast Food', 'Drinks', 'Phone']
    var rentExpenses, groceryExpenses, fitnessExpenses, transportationExpenses, creditCard, fastFoodExpenses, drinksExpenses, phoneExpenses;
    rentExpenses = groceryExpenses = fitnessExpenses = transportationExpenses = creditCard = fastFoodExpenses = drinksExpenses = phoneExpenses = 0.00;
    //Read personal bank chequing account csv
    //csv MUST be formatted like so : date, name of transaction, withdraw $, deposit $, account size $
    //Works with TD Bank so far
    fs.createReadStream('purchases.csv')
        .pipe(csv({ headers: false }))
        .on('data', (data) => results.push(data))
        .on('end', () => {
            allData.timeseries = results;
            var formattedForecastData = [];
            var monthlyExpenses = 0.00;
            var lastMonth = '';
            //Loop through transactions and calculate some stuff
            results.some(function (a) {
                //If it's a credit card payment, don't include as I have individual credit card transactions included
                if (a['1'].includes('C\C') || a['1'].includes('TFR-TO'))
                    return;
                //Get stats for current month
                if (moment(a['0']).isSame(moment(), 'month')) {
                    //Calculate biggest expense for the current month
                    if (!isNaN(parseFloat(a['2']))) {
                        expensesStartOfMonth += parseFloat(a['2']);
                        if (parseFloat(a['2']) > biggestExpense) {
                            biggestExpense = parseFloat(a['2']);
                            biggestExpenseName = a['1'];
                        }
                    }
                    //Calculate income for the current month
                    if (!isNaN(parseFloat(a['3']))) {
                        incomeStartOfMonth += parseFloat(a['3']);
                    }
                }
                //Get stats for last month to compare
                if (moment(a['0']).isSame(moment().subtract(1, 'months'), 'month')) {
                    //Calculate biggest expense for the current month
                    if (!isNaN(parseFloat(a['2']))) {
                        expensesLastMonth += parseFloat(a['2']);
                    }
                    //Calculate income for the current month
                    if (!isNaN(parseFloat(a['3']))) {
                        incomeLastMonth += parseFloat(a['3']);
                    }
                }
                //Get data to forecast expenses for next month
                if (!isNaN(parseFloat(a['2']))) {
                    monthlyExpenses += parseFloat(a['2']);
                    if (parseFloat(a['2']) == 550 || parseFloat(a['2']) == 500) {
                        rentExpenses += parseFloat(a['2']);
                    }
                    //Groceries
                    if (a['1'].includes('WAL-MART')
                        || a['1'].includes('FRILL')
                        || a['1'].includes('ZEHRS')
                        || a['1'].includes('CONVENIENCE')
                        || a['1'].includes('LOBLAW')) {
                        groceryExpenses += parseFloat(parseFloat(a['2']).toFixed(2));
                    }
                    //Transportation
                    if (a['1'].includes('UBER')
                        || a['1'].includes('LYFT')
                        || a['1'].includes('GAS')
                        || a['1'].includes('ONROUTE')
                        || a['1'].includes('SHELL')){
                        transportationExpenses += parseFloat(parseFloat(a['2']).toFixed(2));
                    }
                    //Fitness / Gyms
                    if (a['1'].includes('GOODLIFE')
                        || a['1'].includes('FIT')) {
                        fitnessExpenses += parseFloat(parseFloat(a['2']).toFixed(2));
                    }
                    //Fast Food
                    if (a['1'].includes('WENDY')
                        || a['1'].includes('MCD')
                        || a['1'].includes('DAIRY')
                        || a['1'].includes('SUB')
                        || a['1'].includes('BK')
                        || a['1'].includes('SKIP')
                        || a['1'].includes('BUR')
                        || a['1'].includes('HORTON')) {
                        fastFoodExpenses += parseFloat(parseFloat(a['2']).toFixed(2));
                    }
                    //Drinks / Liquor
                    if (a['1'].includes('LCBO')
                        || a['1'].includes('HOO')) {
                        drinksExpenses += parseFloat(parseFloat(a['2']).toFixed(2));
                    }
                    //Phone
                    if (a['1'].includes('TELUS')) {
                        phoneExpenses += parseFloat(parseFloat(a['2']).toFixed(2));
                    }
                }
                //Add transaction $ for the end of each mont so we can graph it
                if (moment(a['0']).endOf('month').diff(moment(a['0']), 'days') <= 3
                    && monthlyExpenses > 0
                    && (!lastMonth || !moment(lastMonth).isSame(moment(a['0']), 'month'))) {
                    formattedForecastData.push([a['0'], monthlyExpenses]);
                    timeSeriesExpenses.push(monthlyExpenses);
                    timeSeriesDates.push(moment(a['0']).format("YYYY/MM/DD"));
                    monthlyExpenses = 0;
                    lastMonth = a['0'];
                }
            });
            allData.expensesStartOfMonth = expensesStartOfMonth;
            allData.incomeStartOfMonth = incomeStartOfMonth;
            allData.expensesLastMonth = expensesLastMonth;
            console.log('This months expenses : ' + expensesStartOfMonth);
            console.log('Last months expenses : ' + expensesLastMonth);
            allData.incomeLastMonth = incomeLastMonth;
            allData.biggestExpense = biggestExpense;
            allData.biggestExpenseName = biggestExpenseName;
            allData.timeSeriesExpenses = timeSeriesExpenses;
            allData.timeSeriesDates = timeSeriesDates;
            allData.expenseCategories = expenseCategories;
            allData.expenseCategoryValues = [groceryExpenses, fitnessExpenses, transportationExpenses, rentExpenses, fastFoodExpenses, drinksExpenses, phoneExpenses];
            //Forecasting for next month
            var t = new timeseries.main(formattedForecastData);
            // We're going to forecast the most recent datapoint
            var forecastDatapoint = formattedForecastData.length - 1;

            // We calculate the AR coefficients of the 10 previous points
            var coeffs = t.ARMaxEntropy({
                data: t.data.slice(0, formattedForecastData.length - 2)
            });

            // Now, we calculate the forecasted value of that 11th datapoint using the AR coefficients:
            var forecast = 0;	// Init the value at 0.
            for (var i = 0; i < coeffs.length; i++) {	// Loop through the coefficients
                forecast -= t.data[(formattedForecastData.length - 2) - i][1] * coeffs[i];
                // Explanation for that line:
                // t.data contains the current dataset, which is in the format [ [date, value], [date,value], ... ]
                // For each coefficient, we substract from "forecast" the value of the "N - x" datapoint's value, multiplicated by the coefficient, where N is the last known datapoint value, and x is the coefficient's index.
            }
            allData.forecast = forecast;
            //Send data to front-end
            res.render('index', { 'data': allData });
        });
});

module.exports = router;
