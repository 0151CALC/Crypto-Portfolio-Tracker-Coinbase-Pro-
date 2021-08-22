
const express = require('express')
const app = express();
const serv = require('http').Server(app);
const io = require('socket.io')(serv);
const fs = require('fs');
const csv = require('csv-parser');
const request = require('request');
const WebSocket = require('ws')

class Buys {
    constructor() {
        this.buys = []
    }
    newBuy(product, price, GBPamount, amount, date, feeInGBP) {
        let b = new Buy(product, price, GBPamount, amount, date, feeInGBP)
        this.buys.push(b);
        return b
    }
    getInitAndNew(BTCPrice, ETHPrice) {
        var initPrice = 0.0;
        var newPrice = 0.0;
        for (i = 0; i < this.buys.length; i++) {
            var buy = this.buys[i];
            var price;
            if (buy.product == "BTC-GBP") {
                price = BTCPrice
            } else if (buy.product == "ETH-GBP") {
                price = ETHPrice
            }
            initPrice += (buy.amount * buy.price)
            newPrice += (buy.amount * price)
        }
        var data = {
            init: initPrice,
            new: newPrice
        }
        return data
    }
    getNetProfit(BTCPrice, ETHPrice) {
        var data = this.getInitAndNew(BTCPrice, ETHPrice)
        return Number.parseFloat(data.new - data.init).toFixed(2)
    }
    getPercentageDiff(BTCPrice, ETHPrice) {
        var data = this.getInitAndNew(BTCPrice, ETHPrice)
        return Number.parseFloat(((data.new - data.init) / data.init) * 100).toFixed(2)
    }
    getData(BTCPrice, ETHPrice) {
        var data = []
        for (i = 0; i < this.buys.length; i++) {
            var buy = this.buys[i]
            var buyData = [buy.product, buy.date, `${buy.amount} @ ${Number.parseFloat(buy.price).toFixed(0)} For ${Number.parseFloat(buy.GBPamount - buy.feeInGBP).toFixed(2)}`, buy.calcPercentageDiff(BTCPrice, ETHPrice), buy.calcProfit(BTCPrice, ETHPrice)]
            data.push(buyData);
        }
        data.push(['Total', '', '', this.getPercentageDiff(BTCPrice, ETHPrice), this.getNetProfit(BTCPrice, ETHPrice)]);
        return data;
    }
}

class Buy {
    constructor(product, price, GBPamount, amount, date, feeInGBP) {
        this.product = product;
        this.price = price;
        this.GBPamount = Math.abs(GBPamount);
        this.amount = amount;
        this.date = date;
        this.feeInGBP = feeInGBP;
    }
    calcProfit(BTCPrice, ETHPrice) {
        var price
        if (this.product == "BTC-GBP") {
            price = BTCPrice
        } else if (this.product == "ETH-GBP") {
            price = ETHPrice
        }
        return Number.parseFloat((this.amount * price) - (this.amount * this.price)).toFixed(2)
    }
    calcPercentageDiff(BTCPrice, ETHPrice) {
        var initPrice = (this.amount * this.price)
        var newPrice;
        if (this.product == "BTC-GBP") {
            newPrice = this.amount * BTCPrice
        } else if (this.product == "ETH-GBP") {
            newPrice = this.amount * ETHPrice
        }
        return Number.parseFloat(((newPrice - initPrice) / initPrice) * 100).toFixed(2)
    }
}

app.get("/", function (req, res) {
    res.sendFile(__dirname + '/index.html');
})

var port = 2000;
if (process.env.HEROKU_PORT) {
    port = process.env.PORT
}

serv.listen(port);
console.log("Server has started...");

let buys = new Buys()

var totalInvested = 0;

var buyData = JSON.parse(fs.readFileSync("data.json"));

for (var i in buyData["buys"]) {
    totalInvested += buyData["buys"][i].amountInGBP
}

fs.createReadStream('data.csv')
.pipe(csv())
    .on('data', (row) => {
        buys.newBuy(row.product, row.price, row.total, row.size, row['created at'], row.fee);
})
.on('end', () => {
    console.log('CSV file successfully processed');
});

var lastBTCPrice = 0;
var lastETHPrice = 0;

const ws = new WebSocket('wss://ws-feed.pro.coinbase.com')

ws.on('open', function open() {
    ws.send('{"type": "subscribe", "product_ids": ["BTC-GBP", "ETH-GBP"], "channels": ["level2", "heartbeat", {"name": "ticker", "product_ids": ["BTC-GBP", "ETH-GBP"]}]}');
});

ws.on('message', function incoming(data) {
    try {
        var data = JSON.parse(data)
        if (data.product_id == "BTC-GBP") {
            lastBTCPrice = data.changes[0][1]
        } else if (data.product_id == "ETH-GBP") {
            lastETHPrice = data.changes[0][1]
        }
    } catch (err) {
        // Just ignore error, only happens when the coinbase socket doesn't return any data. 
    }
});

io.sockets.on('connection', function (socket) {
    socket.join('clients')
})

setInterval(function () {
    update()
    sendGraphData(getDate(0, 0, 1), getDate(0, 0, 0), 'graph1', 'HMS')
    sendGraphData(getDate(0, 0, 3), getDate(0, 0, 0), 'graph2', 'HMS')
    sendGraphData(getDate(0, 1, 0), getDate(0, 0, 0), 'graph3', 'HMS')
    sendGraphData(getDate(0, 7, 0), getDate(0, 0, 0), 'graph4', 'YMD')
    sendGraphData(getDate(1, 0, 0), getDate(0, 0, 0), 'graph5', 'YMD')
    sendGraphData(getDate(6, 0, 0), getDate(0, 0, 0), 'graph6', 'YMD')
}, 1000);

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
        totalInvested: totalInvested,
        buyData: buys.getData(lastBTCPrice, lastETHPrice)
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