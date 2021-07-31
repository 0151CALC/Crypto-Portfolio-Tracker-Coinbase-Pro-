
const express = require('express')
const app = express();
const serv = require('http').Server(app);
const io = require('socket.io')(serv);
const fs = require('fs');
const request = require('request');

app.get("/", function (req, res) {
    res.sendFile(__dirname + '/index.html');
})

serv.listen(2000);

console.log("Server has started...");

var totalInvested = 0;

var buyData = JSON.parse(fs.readFileSync("data.json"));

for (var i in buyData["buys"]) {
    totalInvested += buyData["buys"][i].amountInGBP
}

var lastBTCPrice = 0;
var lastETHPrice = 0;

io.sockets.on('connection', function (socket) {

    socket.join('clients')

    const { BitstampStream, CURRENCY } = require("node-bitstamp");
    const bitstampStream = new BitstampStream();

    bitstampStream.on("connected", () => {
        const btcEurOrderBookChannel = bitstampStream.subscribe(bitstampStream.CHANNEL_ORDER_BOOK, CURRENCY.BTC_GBP);

        bitstampStream.on(btcEurOrderBookChannel, ({ data, event }) => {
            if (lastBTCPrice !== data.asks[0][0]) {
                lastBTCPrice = data.asks[0][0];
                update();
            }
        });

        const ethGbpOrderBookChannel = bitstampStream.subscribe(bitstampStream.CHANNEL_ORDER_BOOK, CURRENCY.ETH_GBP);

        bitstampStream.on(ethGbpOrderBookChannel, ({ data, event }) => {
            if (lastETHPrice !== data.asks[0][0]) {
                lastETHPrice = data.asks[0][0];
                update();
            }
        });
    });

    sendInitGraphData(getDate(0, 0, 1), getDate(0, 0, 0), 'graph1', 'HMS')
    sendInitGraphData(getDate(0, 0, 3), getDate(0, 0, 0), 'graph2', 'HMS')
    sendInitGraphData(getDate(0, 1, 0), getDate(0, 0, 0), 'graph3', 'HMS')
    sendInitGraphData(getDate(0, 7, 0), getDate(0, 0, 0), 'graph4', 'YMD')
    sendInitGraphData(getDate(1, 0, 0), getDate(0, 0, 0), 'graph5', 'YMD')
    sendInitGraphData(getDate(6, 0, 0), getDate(0, 0, 0), 'graph6', 'YMD')

    function sendInitGraphData(fromDate, ToDate, graph, dateFormat) {
        var granularity = Math.floor(((Math.abs(fromDate - ToDate)) / 1000 / 60));

        if (granularity >= 86400) { granularity = 86400 }
        else if (granularity >= 21600) { granularity = 21600 }
        else if (granularity >= 3600) { granularity = 3600 }
        else if (granularity >= 900) { granularity = 900 }
        else if (granularity >= 300) { granularity = 300 }
        else if (granularity >= 60) { granularity = 60 }

        var URL = `https://api.pro.coinbase.com/products/BTC-GBP/candles?start=${getFormattedDate(fromDate, 'Full')}&end=${getFormattedDate(ToDate, 'Full')}&granularity=${granularity}`
        request({ url: URL, headers: { 'User-Agent': 'request' }, json: true }, (error, response, body) => {
            if (!error && response.statusCode == 200) {

                var formattedDataArray = []

                for (i = 0; i < body.length; i++) {
                    var unixTime = body[i][0]
                    var date = new Date(unixTime * 1000);
                    formattedDataArray.unshift([getFormattedDate(date, dateFormat), body[i][1], body[i][3], body[i][4], body[i][2]])
                }
                socket.emit('graphData', {
                    graph: graph,
                    data: formattedDataArray
                })
            }
        });
    }

    bitstampStream.on("error", (e) => console.error(e));
})

setInterval(function () {
    sendGraphData(getDate(0, 0, 1), getDate(0, 0, 0), 'graph1', 'HMS')
    sendGraphData(getDate(0, 0, 3), getDate(0, 0, 0), 'graph2', 'HMS')
    sendGraphData(getDate(0, 1, 0), getDate(0, 0, 0), 'graph3', 'HMS')
    sendGraphData(getDate(0, 7, 0), getDate(0, 0, 0), 'graph4', 'YMD')
    sendGraphData(getDate(1, 0, 0), getDate(0, 0, 0), 'graph5', 'YMD')
    sendGraphData(getDate(6, 0, 0), getDate(0, 0, 0), 'graph6', 'YMD')
}, 5000);

function sendGraphData(fromDate, ToDate, graph, dateFormat) {
    var granularity = Math.floor(((Math.abs(fromDate - ToDate)) / 1000 / 60));

    if (granularity >= 86400) { granularity = 86400 }
    else if (granularity >= 21600) { granularity = 21600 }
    else if (granularity >= 3600) { granularity = 3600 }
    else if (granularity >= 900) { granularity = 900 }
    else if (granularity >= 300) { granularity = 300 }
    else if (granularity >= 60) { granularity = 60 }

    var URL = `https://api.pro.coinbase.com/products/BTC-GBP/candles?start=${getFormattedDate(fromDate, 'Full')}&end=${getFormattedDate(ToDate, 'Full')}&granularity=${granularity}`
    request({ url: URL, headers: { 'User-Agent': 'request' }, json: true }, (error, response, body) => {
        if (!error && response.statusCode == 200) {

            var formattedDataArray = []

            for (i = 0; i < body.length; i++) {
                var unixTime = body[i][0]
                var date = new Date(unixTime * 1000);
                formattedDataArray.unshift([getFormattedDate(date, dateFormat), body[i][1], body[i][3], body[i][4], body[i][2]])
            }
            io.to('clients').emit('graphData', {
                graph: graph,
                data: formattedDataArray
            })
        }
    });
}

function update() {
    io.to('clients').emit('data', {
        BTCPrice: lastBTCPrice,
        ETHPrice: lastETHPrice,
        totalInvested: totalInvested
     });
}

function getDate(periodInMonths, periodInDays, periodInHours) {
    const date = new Date()

    date.setHours(date.getHours() - 1)

    if (periodInMonths != 0) { date.setMonth(date.getMonth() - periodInMonths) }
    if (periodInDays != 0) { date.setDate(date.getDate() - periodInDays) }
    if (periodInHours != 0) { date.setHours(date.getHours() - periodInHours) }
    return date;
}

function getFormattedDate(date, portion) {

    if (portion == 'Full') {
        return date.getFullYear() + '-' + addLeadingZero(date.getMonth() + 1) + '-' + addLeadingZero(date.getDate()) + 'T' + addLeadingZero(date.getHours()) + ':' + addLeadingZero(date.getMinutes()) + ':' + addLeadingZero(date.getSeconds())
    } else if (portion == 'HMS') {
        return addLeadingZero(date.getHours()) + ':' + addLeadingZero(date.getMinutes()) + ':' + addLeadingZero(date.getSeconds())
    } else if (portion == 'YMD') {
        return date.getFullYear() + '-' + addLeadingZero(date.getMonth() + 1) + '-' + addLeadingZero(date.getDate())
    }

    function addLeadingZero(value) {
        if (value < 10) {
            return '0' + value
        } else {
            return value;
        }
    }
}