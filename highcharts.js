const fs = require('fs');
var path = require('path');
const Highcharts = require('highcharts');
require('./node_modules/highcharts/modules/heatmap.src.js')(Highcharts);

const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

var allData; // data from data cleaning
var selectedForum = 7; // the id of the selected forum
var usefulData; // part of allData concerning the selected forum
var usernameList; // list of usernames involved in the selected forum
var months; // array of all the months between the first trace and the last trace on the selected forum (month + year)
var monthsNb; // number of months between the first trace and the last trace on the selected forum
var firstDate; // data of the first trace on the selected forum
var graphData; // data series to draw the graph

var postedMsgIds; // an array with the id of the new posted messages per month

var msgSendMatrix; // 2D array containing the number of msg sent per user per month
var msgAnswerFirstMatrix; // 2D array containing the number of time the user answered a msg in first
var msgAnswerFirstMaxMatrix; // 2D array containing the max number of time the user could have answered a msg in first
var nbMsgReadMatrix;
var totalReadTimeMatrix;
var avgReadTimeMatrix;
var prctgNbReadMsgMatrix;

window.onload = (event) => {
    allData = loadAllData();
    extractForumIds();
    selectedForum = document.getElementById("forums").value;
    document.getElementById("forums").onchange = function() {
        selectedForum = this.children[this.selectedIndex].innerHTML.trim();
        updateAll();
    }
    updateAll();  
};

function updateAll() {
    extractUsefulData();
    extractUsernameAndPeriod();
    initAllMatrix();
    computeMsgSendMatrix();
    computeMsgAnswerFirstMatrix();
    computeNbMsgReadMatrix();
    computeGraphData();
    displayChart();
}

function displayChart() {
    Highcharts.chart("highcharts-container", {

        chart: {
            type: 'heatmap',
            marginTop: 40,
            marginBottom: 80,
            plotBorderWidth: 1
        },
        
        
        title: {
            text: 'Caractère Leader des membres du forum n°' + selectedForum
        },
        
        xAxis: {
            categories: months
        },
        
        yAxis: {
            categories: usernameList,
            title: null,
            reversed: true
        },
        
        accessibility: {
            point: {
                descriptionFormatter: function (point) {
                    var ix = point.index + 1,
                        xName = getPointCategoryName(point, 'x'),
                        yName = getPointCategoryName(point, 'y'),
                        val = point.value;
                    return ix + '. ' + xName + ' sales ' + yName + ', ' + val + '.';
                }
            }
        },
        
        colorAxis: {
            min: 0,
            minColor: '#FFFFFF',
            maxColor: Highcharts.getOptions().colors[0]
        },
        
        legend: {
            align: 'right',
            layout: 'vertical',
            margin: 0,
            verticalAlign: 'top',
            y: 25,
            symbolHeight: 280
        },
        
        tooltip: {
            formatter: function () {
                return '<b>' + getPointCategoryName(this.point, 'y') + '</b> a posté <b>' +
                    getNbMsgRead(this.point) +'</b> message(s),<br> répondu en premier à <b>' +
                    getNbMsgAnswerFirst(this.point) + '/' + getNbMsgAnswerFirstMax(this.point) +
                    '</b> messages,<br> lu <b>' + getPercentageReadMessage(this.point) + '%</b> des message(s)<br>' + 
                    'avec une moyenne de <b>' + getAvgReadTime(this.point) + '</b>'
            }
        },
        
        series: [{
            type: 'heatmap',
            borderWidth: 1,
            data: graphData,
            dataLabels: {
                enabled: true,
                color: '#000000'
            }
        }],
        
        responsive: {
            rules: [{
                condition: {
                    maxWidth: 500
                },
                chartOptions: {
                    yAxis: {
                        labels: {
                            formatter: function () {
                                return this.value.charAt(0);
                            }
                        }
                    }
                }
            }]
        }
        
    });
}


function getPointCategoryName(point, dimension) {
    var series = point.series,
        isY = dimension === 'y',
        axis = series[isY ? 'yAxis' : 'xAxis'];
    return axis.categories[point[isY ? 'y' : 'x']];
}

function getNbMsgRead(point) {
    let username = usernameList[point.y]
    let month = point.x
    return nbMsgReadMatrix[username][month];
}

function getNbMsgAnswerFirst(point) {
    let username = usernameList[point.y]
    let month = point.x
    return msgAnswerFirstMatrix[username][month];
}

function getNbMsgAnswerFirstMax(point) {
    let username = usernameList[point.y]
    let month = point.x
    return msgAnswerFirstMaxMatrix[username][month];
}

function getPercentageReadMessage(point) {
    let username = usernameList[point.y]
    let month = point.x
    return Math.floor(prctgNbReadMsgMatrix[username][month]);
}

function getAvgReadTime(point) {
    let username = usernameList[point.y]
    let month = point.x
    let timeInSec = avgReadTimeMatrix[username][month]
    let res;
    if (timeInSec < 60) {
        res = timeInSec + "s"
    } else if (timeInSec < 60*60) {
        res = Math.floor(timeInSec/60) + "m"
    } else if (timeInSec < 60*60*24) {
        res = Math.floor(timeInSec / (60*60)) + "h"
    } else {
        res = Math.floor(timeInSec / (60*60*24)) + " jour(s)"
    }
    return res;
}

function loadAllData() {
    var jsonPath = path.join(__dirname, '.', 'data.json');
    return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
}

function extractUsefulData() {
    usefulData = [];
    for (let i = 0; i < allData.length; i++) {
        let id = allData[i].IDForum;
        if (id == selectedForum) {
            usefulData.push(allData[i]);
        }
    }
}

function extractForumIds() {
    const idSet = new Set();
    for (let i = 0; i < allData.length; i++) {
        let id = allData[i].IDForum;
        if (id) {
           idSet.add(id)
        }
    }
    let sortedArray = Array.from(idSet).sort(compare);
    let select = document.getElementById("forums");
    for (let i = 0; i < sortedArray.length; i++) {
        select.options[select.options.length] = new Option(sortedArray[i], sortedArray[i]);
    }
    
}

function compare(a, b) {
    return (parseInt(a)-parseInt(b));
}

function extractUsernameAndPeriod() {
    let minDate, maxDate;
    let usernameSet = new Set();
    for (let i = 0; i < usefulData.length; i++) {
        let trace = usefulData[i];
        if (trace.IDForum == selectedForum) {
            usernameSet.add(trace.Utilisateur);
            let date = new Date(trace.Date)
            if (!minDate || date < minDate) {
                minDate = date;
            }
            if (!maxDate || date > maxDate) {
                maxDate = date;
            }
        }
    }
    usernameList = Array.from(usernameSet);

    monthsNb = (maxDate.getFullYear() - minDate.getFullYear()) * 12 + maxDate.getMonth() - minDate.getMonth() + 1;
    firstDate = new Date(minDate.getFullYear(), minDate.getMonth(), 1)
    months = [];
    for (i = 0; i < monthsNb; i++) {
        let date = new Date(firstDate.getTime());
        date = new Date(date.setMonth(date.getMonth()+i));
        months.push(monthNames[date.getMonth()] + " " + date.getFullYear())
    }
}

function initAllMatrix() {
    msgSendMatrix = [];
    msgAnswerFirstMatrix = [];
    msgAnswerFirstMaxMatrix = [];
    nbMsgReadMatrix = [];
    totalReadTimeMatrix = [];
    avgReadTimeMatrix = [];
    prctgNbReadMsgMatrix = [];
    //init the matrix with full 0
    for (let i = 0; i < usernameList.length; i++) {
        msgSendMatrix[usernameList[i]] = [];
        msgAnswerFirstMatrix[usernameList[i]] = [];
        msgAnswerFirstMaxMatrix[usernameList[i]] = [];
        nbMsgReadMatrix[usernameList[i]] = [];
        totalReadTimeMatrix[usernameList[i]] = [];
        avgReadTimeMatrix[usernameList[i]] = [];
        prctgNbReadMsgMatrix[usernameList[i]] = [];
        for (let j = 0; j < monthsNb; j++) {
            msgSendMatrix[usernameList[i]][j] = 0;
            msgAnswerFirstMatrix[usernameList[i]][j] = 0;
            msgAnswerFirstMaxMatrix[usernameList[i]][j] = 0;
            nbMsgReadMatrix[usernameList[i]][j] = 0;
            totalReadTimeMatrix[usernameList[i]][j] = 0;
            avgReadTimeMatrix[usernameList[i]][j] = 0;
            prctgNbReadMsgMatrix[usernameList[i]][j] = 0;
        }
    }
}

function computeMsgSendMatrix() {   
    // count the number of message posted and add the id of msg in an array
    postedMsgIds = [];
    for (let i = 0; i < monthsNb; i++) {
        postedMsgIds[i] = [];
    }
    for (let i = 0; i < usefulData.length; i++) {
        if (usefulData[i].Titre == "Poster un nouveau message") {
            let username = usefulData[i].Utilisateur;
            let date = new Date(usefulData[i].Date);
            let month = (date.getFullYear() - firstDate.getFullYear()) * 12 + date.getMonth() - firstDate.getMonth();
            msgSendMatrix[username][month] += 1;

            postedMsgIds[month].push({
                IDMsg: usefulData[i].IDMsg,
                Date: usefulData[i].Date
            });
        }
    }
}


function computeMsgAnswerFirstMatrix() {
    // count the number of msg answered first
    for (let i = 0; i < postedMsgIds.length; i++) {
        for (let j = 0; j < postedMsgIds[i].length; j++) {
            for(let k = 0; k < usefulData.length; k++) {
                if (usefulData[k].Titre == "Répondre à un message" && usefulData[k].IDParent == postedMsgIds[i][j].IDMsg) {
                    let username = usefulData[k].Utilisateur;
                    let date = new Date(postedMsgIds[i][j].Date);
                    let month = (date.getFullYear() - firstDate.getFullYear()) * 12 + date.getMonth() - firstDate.getMonth();
                    msgAnswerFirstMatrix[username][month] += 1;
                    break;
                }
            }
        }
    }
    // count the number of time the user could have answered a msg first
    for (let i = 0; i < usernameList.length; i++) {
        for (let j = 0; j < monthsNb; j++) {
            msgAnswerFirstMaxMatrix[usernameList[i]][j] = postedMsgIds[j].length - msgSendMatrix[usernameList[i]][j];
            if (msgAnswerFirstMaxMatrix[usernameList[i]][j] < msgAnswerFirstMatrix[usernameList[i]][j]) {
                msgAnswerFirstMatrix[usernameList[i]][j] = msgAnswerFirstMaxMatrix[usernameList[i]][j]
            }
        }
    }    
}

function computeNbMsgReadMatrix() {
    let msgReadPerUserSet = [];
    let msgReadPerUserInfo = [];
    for (let i = 0; i < usernameList.length; i++) {
        msgReadPerUserSet[usernameList[i]] = new Set()
        msgReadPerUserInfo[usernameList[i]] = [];
    }

    for (let i = 0; i < usefulData.length; i++) {
        if (usefulData[i].Titre == "Afficher le contenu d'un message") {
            let username = usefulData[i].Utilisateur;
            if (!msgReadPerUserSet[username].has(usefulData[i].IDMsg)) {
                msgReadPerUserSet[username].add(usefulData[i].IDMsg);
                msgReadPerUserInfo[username][usefulData[i].IDMsg] = usefulData[i].Date;
            }
        }
    }

    for (let i = 0; i < usernameList.length; i++) {
        msgReadPerUserSet[usernameList[i]] = Array.from(msgReadPerUserSet[usernameList[i]]);
        for (let j = 0; j < postedMsgIds.length; j++) {
            for (let k = 0; k < postedMsgIds[j].length; k++) {
                for (let l = 0; l < msgReadPerUserSet[usernameList[i]].length; l++) {
                    if (msgReadPerUserSet[usernameList[i]][l] == postedMsgIds[j][k].IDMsg) {
                        nbMsgReadMatrix[usernameList[i]][j] += 1;

                        //add time spent before reading msg
                        let sendDate = new Date(postedMsgIds[j][k].Date);
                        let readDate = new Date(msgReadPerUserInfo[usernameList[i]][postedMsgIds[j][k].IDMsg])
                        let timeInSec = (readDate-sendDate) / 1000;

                        totalReadTimeMatrix[usernameList[i]][j] += timeInSec;
                    }
                }
            }
        }
    }  
}

function computeGraphData() {
    graphData = [];
    var finalScoreMatrix = [];

    for (let i = 0; i < usernameList.length; i++) {
        finalScoreMatrix[usernameList[i]] = [];
        for (let j = 0; j < monthsNb; j++) {

            let totalMsgSend = postedMsgIds[j].length;

            //msg send
            let nbMsgSend = msgSendMatrix[usernameList[i]][j];
            if (totalMsgSend == 0) {
                finalScoreMatrix[usernameList[i]][j] = 0
            } else {
                finalScoreMatrix[usernameList[i]][j] = (nbMsgSend / totalMsgSend) * 25;
            }

            //msg answer first
            let nbFirstMsgAnswer = msgAnswerFirstMatrix[usernameList[i]][j];
            let nbFirstMsgAnswerMax = msgAnswerFirstMaxMatrix[usernameList[i]][j];
            if (nbFirstMsgAnswerMax == 0) {
                finalScoreMatrix[usernameList[i]][j] += 0;
            } else {
                finalScoreMatrix[usernameList[i]][j] += (nbFirstMsgAnswer / nbFirstMsgAnswerMax) * 25;
            }
        
            // read msg percentage
            let nbMsgRead = nbMsgReadMatrix[usernameList[i]][j];
            if (totalMsgSend == 0) {
                finalScoreMatrix[usernameList[i]][j] += 0;
            } else {
                finalScoreMatrix[usernameList[i]][j] += (nbMsgRead / totalMsgSend) * 25;
                prctgNbReadMsgMatrix[usernameList[i]][j] = (nbMsgRead / totalMsgSend) * 100
            }


            // avg read time
            let totalTime = totalReadTimeMatrix[usernameList[i]][j];
            let scoreToAdd = 0
            if (nbMsgRead == 0) {
                scoreToAdd = 0
            } else {
                let avgTime = totalTime / nbMsgRead;
                avgReadTimeMatrix[usernameList[i]][j] = avgTime;
                if (avgTime < 1*60*60) { // 1h
                    scoreToAdd = 25;
                } else if (avgTime < 2*60*60) { // 2h
                    scoreToAdd = 20;
                } else if (avgTime < 1*60*60) { // 5h
                    scoreToAdd = 15;
                } else if (avgTime < 24*60*60) { // 24h
                    scoreToAdd = 10;
                } else if (avgTime < 2*24*60*60) { // 2 jours
                    scoreToAdd = 5;
                }
            } 
            finalScoreMatrix[usernameList[i]][j] += scoreToAdd;
        }
    }
    for (let i = 0; i < usernameList.length; i++) {
        for (let j = 0; j < monthsNb; j++) {
            graphData.push([j, i, Math.trunc(finalScoreMatrix[usernameList[i]][j])]);
        }
    }
}

