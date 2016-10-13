//DEBUG NOTE: REMEMBER TO MANUALLY ADD MODES DOCUMENT

PlayersList = new Mongo.Collection('players');
QuestionsList = new Mongo.Collection('questions');
Modes = new Mongo.Collection('mode');


var mode = 0;
var PORT = 6112;
//var HOST = '192.168.88.2';
var HOST = '192.168.10.184';
var currentPlayer;
var currentPlayerID;
var selectedQuestion = 0;
var answeredCorrectly = false;

Meteor.methods({
    'createPlayer': function(str){
    	if (Modes.findOne({ mode: 0}) != null) {
    		var re = /([^\!]+)\!(\d+)/;
    		var userInfo = str.split(re);
    		currentPlayer = userInfo[1];
    		currentPlayerID = userInfo[2];
    		console.log('Name: ' + userInfo[1] + " ID: " + userInfo[2]);
    		PlayersList.update({}, {$set: {currentPlayer: false}}, {multi: true});
    		if (PlayersList.findOne({ pernr: userInfo[2] }) == null) {
    			console.log("added a new player!");
				PlayersList.insert({ name: userInfo[1], score: 0, pernr: userInfo[2], currentPlayer: true });
    		}

			PlayersList.update({ pernr: userInfo[2] }, { $set: {currentPlayer: true }});
			Modes.update({ mode: 0 }, {mode: 1});
    	}
    },

    'awardPoint': function(str){
    	PlayersList.update({ currentPlayer: true }, { $inc: {score: 1}});
    },

    'mode0to1': function(str){
    	Modes.update({ mode: 0 }, {mode: 1});
    },
    'mode1to2': function(str){
    	Modes.update({ mode: 1 }, {mode: 2});
    },

    'mode2to3': function(str){
    	Modes.update({ mode: 2 }, {mode: 3});
    	Meteor._sleepForMs(5000);
    	Modes.update({ mode: 3 }, {mode: 0});
    },    
    'mode3to0': function(str){
    	Modes.update({ mode: 3 }, {mode: 0});
    },

});



if(Meteor.isClient){

	//Keystroke listener
	Template.leaderboard.onCreated(() => {
    $(document).on('keyup', (e) => {
    	console.log(e.keyCode);
    	console.log("Question: " + selectedQuestion);
        if (e.keyCode == 69 && Modes.findOne({ mode: 1}) != null) {
        	console.log('E has been pressed. Entering Trivia mode.');
        	selectedQuestion = Math.floor(Math.random() * QuestionsList.find().count());
        	Meteor.call('mode1to2');
        }
        if ((e.keyCode == 68 || e.keyCode == 67 || e.keyCode == 66 || e.keyCode == 65) && Modes.findOne({ mode: 2}) != null) {
    		//if keyCode matches correct answer, award points, show correct answer in green, reset
    		//else, show correct answer in green, incorrect answer in red, reset

    		if (e.keyCode == QuestionsList.findOne({}, {skip: selectedQuestion, limit: 1}).correctAnswer.charCodeAt(0)) {
    			answeredCorrectly = true;
    			Meteor.call('awardPoint');
    			Meteor.call('mode2to3');
    		}
    		else {
    			answeredCorrectly = false;
    			Meteor.call('mode2to3');
    		}
    	}

        });



    });

	//Show leaderboard (sorted) if mode == 0
    Template.leaderboard.helpers({
        'player0': function(){
            return PlayersList.find({}, { sort: {score: -1, name: 1} });
        },

        'player1': function(){
            return PlayersList.findOne({ currentPlayer: true });
        },

        'question': function(){
            return QuestionsList.findOne({}, {skip: selectedQuestion, limit: 1});
        },

        'mode0': function(){
        	return (Modes.findOne({ mode: 0}) != null);
        },

        'mode1': function(){
        	return (Modes.findOne({ mode: 1}) != null);
        },

        'mode2': function(){
        	return (Modes.findOne({ mode: 2}) != null);
        },

        'mode3': function(){
        	return (Modes.findOne({ mode: 3}) != null);
        },

         'correct': function(){
        	return answeredCorrectly;
        },
        
         'incorrect': function(){

        	return !answeredCorrectly;
        },              

        'correctClass': function(){
        	return "correct";
        }, 
        'incorrectClass': function(){
        	return "incorrect";
        },  

    });

    Template.leaderboard.events({

    });
}



if(Meteor.isServer) {
//Listening for a UDP packet to start the game. This is the reason why Pop Quiz is not scalable at the moment.
//Look into websockets.


var dgram = require('dgram');
var server = dgram.createSocket('udp4');

server.on('listening', function () {
    var address = server.address();
    console.log('UDP Server listening on ' + address.address + ":" + address.port);
});

//Upon finding a packet, sets current player, increments mode to begin game
server.on('message', Meteor.bindEnvironment(function (message, remote) {
    console.log(remote.address + ':' + remote.port +' - ' + message);
    var str = message.toString();
    Meteor.call('createPlayer', str);
}));
//

server.bind(PORT, HOST);
}



