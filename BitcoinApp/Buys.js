// JavaScript source code

class Buys {
    constructor() {
        this.buys = []
    }
    newBuy(product, price, GBPamount, amount, date, feeInGBP) {
        let b = new Buy(product, price, GBPamount, amount, date, feeInGBP)
        this.buys.push(b);
        return b
    }
    getAmountPaidForAllProducts() {
        var amount = 0.0;
        for (i = 0; i < this.buys.length; i++) {
            amount += Number.parseFloat(this.buys[i].GBPamount);
        }
        return amount.toFixed(2)
    }
    getTotalAmountOfProduct(product) {
        var amount = 0.0;
        for (i = 0; i < this.buys.length; i++) {
            var buy = this.buys[i];
            if (buy.product == product) {
                amount += Number.parseFloat(buy.amount);
            }
        }
        return amount.toFixed(8)
    }
    getAveragePriceOfProduct(product) {
        var totalPrice = 0.0;
        var amountOfBuys = 0;
        for (i = 0; i < this.buys.length; i++) {
            var buy = this.buys[i];
            if (buy.product == product) {
                totalPrice += Number.parseFloat(buy.price);
                amountOfBuys += 1;
            }
        }
        return Number.parseFloat(totalPrice / amountOfBuys).toFixed(0);
    }
    getTotalAmountPaidForProduct(product) {
        var paid = 0.0;
        for (i = 0; i < this.buys.length; i++) {
            var buy = this.buys[i];
            if (buy.product == product) {
                paid += Number.parseFloat(buy.amount * buy.price);
            }
        }
        return Number.parseFloat(paid).toFixed(2);
    }
    getInitAndNew(product, BTCPrice, ETHPrice) {
        var initPrice = 0.0;
        var newPrice = 0.0;
        for (i = 0; i < this.buys.length; i++) {
            var buy = this.buys[i];
            if (product == buy.product || product == "Both") {
                var price;
                if (buy.product == "BTC-GBP") {
                    price = BTCPrice
                } else if (buy.product == "ETH-GBP") {
                    price = ETHPrice
                }
                initPrice += (buy.amount * buy.price)
                newPrice += (buy.amount * price)
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
        for (i = 0; i < this.buys.length; i++) {
            var buy = this.buys[i]
            var buyData = [buy.product, buy.date, `${buy.amount} @ ${Number.parseFloat(buy.price).toFixed(0)} For ${Number.parseFloat(buy.GBPamount - buy.feeInGBP).toFixed(2)}`, buy.calcPercentageDiff(BTCPrice, ETHPrice), buy.calcProfit(BTCPrice, ETHPrice)]
            data.push(buyData);
        }
        data.push(['ETH Total', '', `${this.getTotalAmountOfProduct('ETH-GBP')} @ ${this.getAveragePriceOfProduct('ETH-GBP')} For ${this.getTotalAmountPaidForProduct('ETH-GBP')}`, this.getPercentageDiff('ETH-GBP', BTCPrice, ETHPrice), this.getNetProfit('ETH-GBP', BTCPrice, ETHPrice)]);
        data.push(['BTC Total', '', `${this.getTotalAmountOfProduct('BTC-GBP')} @ ${this.getAveragePriceOfProduct('BTC-GBP')} For ${this.getTotalAmountPaidForProduct('BTC-GBP')}`, this.getPercentageDiff('BTC-GBP', BTCPrice, ETHPrice), this.getNetProfit('BTC-GBP', BTCPrice, ETHPrice)]);
        data.push(['Total', '', '', this.getPercentageDiff('Both', BTCPrice, ETHPrice), this.getNetProfit('Both', BTCPrice, ETHPrice)]);
        return data;
    }
}

class Buy {
    constructor(product, price, GBPamount, amount, date, feeInGBP) {
        this.product = product;
        this.price = price;
        this.GBPamount = GBPamount;
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