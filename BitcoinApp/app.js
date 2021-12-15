const express = require('express')
const app = express();
const serv = require('http').Server(app);
const io = require('socket.io')(serv);
const request = require('request');
const WebSocket = require('ws')
const axios = require("axios");

class Fills {
    constructor() {
        this.fills = []
    }
    newFill(product, price, GBPamount, amount, date, feeInGBP, side) {
        let f = new Fill(product, price, GBPamount, amount, date, feeInGBP, side)
        this.fills.push(f);
        return f
    }
    getAmountPaidForAllProducts() {
        var paid = 0.0;
        for (var i = 0; i < this.fills.length; i++) {
            var fill = this.fills[i];
            if (fill.side == 'buy') {
                paid += Number.parseFloat(fill.amount * fill.price);
            } else if (fill.side == 'sell') {
                paid -= Number.parseFloat(fill.amount * fill.price);
            }
        }
        return Number.parseFloat(paid).toFixed(2);
    }
    getTotalAmountOfProduct(product) {
        var amount = 0.0;
        for (var i = 0; i < this.fills.length; i++) {
            var fill = this.fills[i];
            if (fill.product == product && fill.side == 'buy') {
                amount += Number.parseFloat(fill.amount);
            } else if (fill.product == product && fill.side == 'sell') {
                amount -= Number.parseFloat(fill.amount);
            }
        }
        return amount.toFixed(8)
    }
    getAveragePriceOfProduct(product) {
        var totalPrice = 0.0;
        var amountOfFills = 0;
        for (var i = 0; i < this.fills.length; i++) {
            var fill = this.fills[i];
            if (fill.product == product && fill.side == 'buy') {
                totalPrice += Number.parseFloat(fill.price);
                amountOfFills += 1;
            }
        }
        return Number.parseFloat(totalPrice / amountOfFills).toFixed(0);
    }
    getTotalAmountPaidForProduct(product) {
        var paid = 0.0;
        for (var i = 0; i < this.fills.length; i++) {
            var fill = this.fills[i];
            if (fill.product == product && fill.side == 'buy') {
                paid += Number.parseFloat(fill.amount * fill.price);
            } else if (fill.product == product && fill.side == 'sell') {
                paid -= Number.parseFloat(fill.amount * fill.price);
            }
        }
        return Number.parseFloat(paid).toFixed(2);
    }
    getInitAndNew(product, BTCPrice, ETHPrice) {
        var initPrice = 0.0;
        var newPrice = 0.0;
        for (var i = 0; i < this.fills.length; i++) {
            var fill = this.fills[i];
            if (product == fill.product || product == "Both") {
                var price;
                if (fill.product == "BTC-GBP") {
                    price = BTCPrice
                } else if (fill.product == "ETH-GBP") {
                    price = ETHPrice
                }
                if (fill.side == 'buy') {
                    initPrice += (fill.amount * fill.price)
                    newPrice += (fill.amount * price)
                } else if (fill.side == 'sell') {
                    initPrice -= (fill.amount * fill.price)
                    newPrice -= (fill.amount * price)
                }
            }
        }
        var data = {
            init: initPrice,
            new: newPrice
        }
        return data
    }
    getNetProfit(product, BTCPrice, ETHPrice) {
        var data = this.getInitAndNew(product, BTCPrice, ETHPrice)
        return Number.parseFloat(data.new - data.init).toFixed(2)
    }
    getPercentageDiff(product, BTCPrice, ETHPrice) {
        var data = this.getInitAndNew(product, BTCPrice, ETHPrice)
        return Number.parseFloat(((data.new - data.init) / data.init) * 100).toFixed(2)
    }
    getData(BTCPrice, ETHPrice) {
        var data = []
        for (var i = 0; i < this.fills.length; i++) {
            var fill = this.fills[i]
            if (fill.GBPamount > 5.00) {
                var buyData = [fill.product, fill.date, `${fill.amount} @ ${Number.parseFloat(fill.price).toFixed(0)} For ${Number.parseFloat(fill.GBPamount - fill.feeInGBP).toFixed(2)}`, fill.calcPercentageDiff(BTCPrice, ETHPrice), fill.calcProfit(BTCPrice, ETHPrice), fill.side]
                data.push(buyData);
            }
        }
        data.push(['ETH Total', '', `${this.getTotalAmountOfProduct('ETH-GBP')} @ ${this.getAveragePriceOfProduct('ETH-GBP')} For ${this.getTotalAmountPaidForProduct('ETH-GBP')}`, this.getPercentageDiff('ETH-GBP', BTCPrice, ETHPrice), this.getNetProfit('ETH-GBP', BTCPrice, ETHPrice)]);
        data.push(['BTC Total', '', `${this.getTotalAmountOfProduct('BTC-GBP')} @ ${this.getAveragePriceOfProduct('BTC-GBP')} For ${this.getTotalAmountPaidForProduct('BTC-GBP')}`, this.getPercentageDiff('BTC-GBP', BTCPrice, ETHPrice), this.getNetProfit('BTC-GBP', BTCPrice, ETHPrice)]);
        data.push(['Total', '', `${this.getAmountPaidForAllProducts()} Total Invested`, this.getPercentageDiff('Both', BTCPrice, ETHPrice), this.getNetProfit('Both', BTCPrice, ETHPrice)]);
        return data;
    }
}

class Fill {
    constructor(product, price, GBPamount, amount, date, feeInGBP, side) {
        this.product = product;
        this.price = price;
        this.GBPamount = GBPamount;
        this.amount = amount;
        this.date = date;
        this.feeInGBP = feeInGBP;
        this.side = side;
    }
    calcProfit(BTCPrice, ETHPrice) {
        var profit = 0.00;
        var price;
        if (this.product == "BTC-GBP") {
            price = BTCPrice
        } else if (this.product == "ETH-GBP") {
            price = ETHPrice
        }
        if (this.side == 'buy') {
            profit = Number.parseFloat((this.amount * price) - (this.amount * this.price)).toFixed(2)
        } else if (this.side == 'sell') {
            profit = Number.parseFloat((this.amount * price) - (this.amount * this.price)).toFixed(2) - (Number.parseFloat((this.amount * price) - (this.amount * this.price)).toFixed(2) * 2)
        }
        return profit;
    }
    calcPercentageDiff(BTCPrice, ETHPrice) {
        var initPrice = (this.amount * this.price)
        var newPrice;
        var percentage = 0.00;
        if (this.product == "BTC-GBP") {
            newPrice = this.amount * BTCPrice
        } else if (this.product == "ETH-GBP") {
            newPrice = this.amount * ETHPrice
        }
        if (this.side == 'buy') {
            percentage = Number.parseFloat(((newPrice - initPrice) / initPrice) * 100).toFixed(2)
        } else if (this.side == 'sell') {
            percentage = Number.parseFloat(((newPrice - initPrice) / initPrice) * 100).toFixed(2) - (Number.parseFloat(((newPrice - initPrice) / initPrice) * 100).toFixed(2) * 2)
        }
        return percentage;
    }
}

function calcPercentageDiff(newNum, oldNum) {
    var newNum = Number.parseFloat(newNum)
    var oldNum = Number.parseFloat(oldNum)
    return Number.parseFloat(((oldNum - newNum) / newNum) * 100).toFixed(2)
}

const formUrlEncoded = x =>
    Object.keys(x).reduce((p, c) => p + `&${c}=${encodeURIComponent(x[c])}`, '')

app.get("/", function (req, res) {
    res.sendFile(__dirname + '/index2.html');
});

app.get("/old", function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.get("/oauth/redirect", function (req, res) {
    axios({
        method: "POST",
        url: 'https://api.coinbase.com/oauth/token',
        data: formUrlEncoded({
            grant_type: 'authorization_code',
            code: req.query.code,
            client_id: 'c6e2ce355a64784293d7f9fe43596f5328b526a28b9a4bb80128b3a91095605c',
            client_secret: 'e8631894dd9ca249dd6816fb55397045223f8a2d0a063d9b915532d6013f42e9',
            redirect_uri: 'http://localhost:2000/oauth/redirect'
        }),
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then((response) => {

        var access_token = response.data.access_token

        axios({
            method: "GET",
            url: 'https://api.coinbase.com/v2/accounts',
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json'
            }
        }).then((response) => {
            console.log(response.data.data[0].id)

            axios({
                method: "GET",
                url: `https://api.coinbase.com/v2/accounts/${response.data.data[0].id}/buys`,
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            }).then((response) => {
                console.log(response.data)
            })
        });
        res.redirect('http://localhost:2000');
    });
});

var port = 2000;
if (process.env.HEROKU_PORT) {
    port = process.env.PORT
}

serv.listen(port);
console.log("Server has started...");

var socketConnections = []
var clientOptions = []

io.sockets.on('connection', function (socket) {
    socket.join('clients')
    socket.join(socket.id)
    socketConnections.push(socket.id)

    clientOptions.push({
        socketID: socket.id,
        productPairSelected: 'BTC-GBP'
    })

    updateGraphs('BTC-GBP', socket.id);

    socket.on('disconnect', function () {
        var index = socketConnections.indexOf(socket.id);
        socketConnections.splice(index, 1)
        clientOptions.splice(index, 1)
    })

    socket.on('changeProductPair', function (data) {
        var index = socketConnections.indexOf(socket.id);
        clientOptions[index].productPairSelected = data.productPair
        updateGraphs(data.productPair, socket.id);
    })

    socket.on('requestUpdatedGraphs', function () {
        var index = socketConnections.indexOf(socket.id);
        updateGraphs(clientOptions[index].productPairSelected, socket.id);
    })
})

let fills = new Fills()

const { CoinbasePro } = require('coinbase-pro-node');

const auth = {
    apiKey: process.env.CP_KEY,
    apiSecret: process.env.CP_SS,
    passphrase: process.env.CP_PP,
    useSandbox: false,
};

const client = new CoinbasePro(auth);
const prices = new Map();
const ws = new WebSocket('wss://ws-feed.pro.coinbase.com')

ws.on('open', function open() {
    ws.send('{"type": "subscribe", "product_ids": ["BTC-GBP", "ETH-GBP", "BTC-USD", "ETH-USD"], "channels": ["level2", "heartbeat", {"name": "ticker", "product_ids": ["BTC-GBP", "ETH-GBP", "BTC-USD", "ETH-USD"]}]}');
});

ws.on('message', function incoming(data) {
    try {
        var data = JSON.parse(data)
        prices.set(data.product_id, data.changes[0][1]);
    } catch (err) {
        // Just ignore error, only happens when the coinbase socket doesn't return any data. 
    }
});

updateFills()

setInterval(function () {
    update()
}, 500); //Update price of products every 0.5 seconds

setInterval(function () {
    for (i = 0; i < clientOptions.length; i++) {
        updateGraphs(clientOptions[i].productPairSelected, clientOptions[i].socketID)
    }
    console.log(clientOptions)
}, 5000); //Update graphs every 5 seconds (unless requested by client)

setInterval(function () {
    updateFills()
}, 900000); //Update client filles every 15 minutes

//Just some testing ignore.

//client.rest.transfer.getTransfers('deposit').then(transfers => {

//    for (i = 0; i < transfers.data.length; i++) {
//        if (!!transfers.data[i].details.crypto_address) {
//            console.log(transfers.data[i]);
//        }
//    }
//});

function updateFills() {
    fills.fills = []
    client.rest.fill.getFillsByProductId('BTC-GBP').then(fill => {
        for (i = 0; i < fill.data.length; i++) {
            fills.newFill(fill.data[i].product_id, fill.data[i].price, ((fill.data[i].size * fill.data[i].price) + Number.parseFloat(fill.data[i].fee)), fill.data[i].size, new Date(fill.data[i].created_at), fill.data[i].fee, fill.data[i].side)
        }
        console.log(fills.fills)
    });
    client.rest.fill.getFillsByProductId('ETH-GBP').then(fill => {
        for (i = 0; i < fill.data.length; i++) {
            fills.newFill(fill.data[i].product_id, fill.data[i].price, ((fill.data[i].size * fill.data[i].price) + Number.parseFloat(fill.data[i].fee)), fill.data[i].size, new Date(fill.data[i].created_at), fill.data[i].fee, fill.data[i].side)
        }
    });
}

function updateGraphs(productPair, socketID) {
    sendGraphData(getDate(0, 0, 1), getDate(0, 0, 0), 'graph1', 'HMS', productPair, socketID)
    sendGraphData(getDate(0, 0, 3), getDate(0, 0, 0), 'graph2', 'HMS', productPair, socketID)
    sendGraphData(getDate(0, 1, 0), getDate(0, 0, 0), 'graph3', 'HMS', productPair, socketID)
    sendGraphData(getDate(0, 7, 0), getDate(0, 0, 0), 'graph4', 'YMD', productPair, socketID)
    sendGraphData(getDate(1, 0, 0), getDate(0, 0, 0), 'graph5', 'YMD', productPair, socketID)
    sendGraphData(getDate(6, 0, 0), getDate(0, 0, 0), 'graph6', 'YMD', productPair, socketID)
}

function sendGraphData(fromDate, ToDate, graph, dateFormat, productPair, socketID) {
    var granularity = Math.floor(((Math.abs(fromDate - ToDate)) / 1000 / 60));

    if (granularity >= 86400) { granularity = 86400 }
    else if (granularity >= 21600) { granularity = 21600 }
    else if (granularity >= 3600) { granularity = 3600 }
    else if (granularity >= 900) { granularity = 900 }
    else if (granularity >= 300) { granularity = 300 }
    else if (granularity >= 60) { granularity = 60 }

    var URL = `https://api.pro.coinbase.com/products/${productPair}/candles?start=${getFormattedDate(fromDate, 'Full')}&end=${getFormattedDate(ToDate, 'Full')}&granularity=${granularity}`
    request({ url: URL, headers: { 'User-Agent': 'request' }, json: true }, (error, response, body) => {
        if (!error && response.statusCode == 200) {

            var formattedDataArray = []
            var highest = 0.0;
            var lowest = body[0][1];

            for (var i = 0; i < body.length; i++) {
                var unixTime = body[i][0]
                var date = new Date(unixTime * 1000);
                if (Number.parseFloat(body[i][2]) > highest) { highest = Number.parseFloat(body[i][2]) }
                if (Number.parseFloat(body[i][1]) < lowest) { lowest = Number.parseFloat(body[i][1]) }
                formattedDataArray.unshift([getFormattedDate(date, dateFormat), body[i][1], body[i][3], body[i][4], body[i][2]])
            }

            io.to(socketID).emit('graphData', {
                graph: graph,
                data: formattedDataArray,
                percentage: calcPercentageDiff(formattedDataArray[0][1], formattedDataArray[formattedDataArray.length - 1][4]),
                highest: highest,
                lowest: lowest
            })
        }
    });
}

function update() {
    for (i = 0; i < socketConnections.length; i++) {
        var leftPrice = 0;
        var rightPrice = 0;
        if (clientOptions[i].productPairSelected == 'BTC-GBP' || clientOptions[i].productPairSelected == 'ETH-GBP') {
            leftPrice = prices.get('BTC-GBP');
            rightPrice = prices.get('ETH-GBP');
        } else if (clientOptions[i].productPairSelected == 'BTC-USD' || clientOptions[i].productPairSelected == 'ETH-USD') {
            leftPrice = prices.get('BTC-USD');
            rightPrice = prices.get('ETH-USD');
        }
        io.to(socketConnections[i]).emit('data', {
            leftPrice: leftPrice,
            rightPrice: rightPrice,
            BTCAmount: fills.getTotalAmountOfProduct('BTC-GBP'),
            ETHAmount: fills.getTotalAmountOfProduct('ETH-GBP'),
            netProfit: fills.getNetProfit('Both', prices.get('BTC-GBP'), prices.get('ETH-GBP')),
            totalInvested: fills.getAmountPaidForAllProducts(),
            buyData: fills.getData(prices.get('BTC-GBP'), prices.get('ETH-GBP'))
        });
    }
}

function getDate(periodInMonths, periodInDays, periodInHours) {
    const date = new Date()
    date.setHours(date.getHours())
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