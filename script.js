var isLoading = false;
var isConnected = false;
var url = "";
var version = "";

var profileType = "profiles";
var profileName = "";

var timer;

var currentPlayers = new Array();
var currentFriends = [];
var clientFriends = [];

// persistent data
var cachePlayers = {};
var banPlayers = [];

onload = function() {
	var webview = document.querySelector('webview');
	var players = document.getElementById("players");
	var teams = document.getElementById("teams");
	var lobby = document.getElementById("lobby_panel");
	var recentlyPlayedWith = document.getElementById("recently_played_with_panel");
	
	showMessage("Initialization...");
	
	webview.addEventListener('loadstart', handleLoadStart);
	webview.addEventListener('loadstop', handleLoadStop);
	
	document.getElementById('player_0').addEventListener('loadstop', handleLoadStopPlayer0);
	document.getElementById('player_1').addEventListener('loadstop', handleLoadStopPlayer1);
	document.getElementById('player_2').addEventListener('loadstop', handleLoadStopPlayer2);
	document.getElementById('player_3').addEventListener('loadstop', handleLoadStopPlayer3);
	document.getElementById('player_4').addEventListener('loadstop', handleLoadStopPlayer4);
	
	document.getElementById('friends_client').addEventListener('loadstop', handleLoadStopFriendsClient);
	document.getElementById('friends_0').addEventListener('loadstop', handleLoadStopFriends0);
	document.getElementById('friends_1').addEventListener('loadstop', handleLoadStopFriends1);
	document.getElementById('friends_2').addEventListener('loadstop', handleLoadStopFriends2);
	document.getElementById('friends_3').addEventListener('loadstop', handleLoadStopFriends3);
	document.getElementById('friends_4').addEventListener('loadstop', handleLoadStopFriends4);
	
	document.getElementById('lobby').onclick = function () {
		recentlyPlayedWith.style.display = "none";
		lobby.style.display = "initial";
	}
	
	document.getElementById('recently_played_with').onclick = function () {
		lobby.style.display = "none";
		recentlyPlayedWith.style.display = "initial";
	}
	
	document.getElementById("disconnect").onclick = function () {
		clearTimeout(timer);
		
		webview.src = "https://steamcommunity.com/login/logout";
		
		showMessage("Disconnection...");
	};
	
	chrome.storage.local.get('cachePlayers', function(items) {
		// cache limit
		if(Object.size(items['cachePlayers']) < 60) {
			cachePlayers = items['cachePlayers'];
		}
		
		updateRecentlyPlayedWith();
		
		console.log(cachePlayers);
	});
	
	chrome.storage.local.get('banPlayers', function(items) {		
		if(items['banPlayers'] != undefined) {
			banPlayers = items['banPlayers'];
		}
		console.log(banPlayers);
	});
	
	checkVersion();
	
	function handleLoadStart(event) {
		isLoading = true;
		
		webview.style.visibility = "hidden";
	}
	
	function handleLoadStop(event) {
		isLoading = false;		
		url = webview.src;
		
		console.log(url);
		
		if(url == "http://steamcommunity.com/discussions/" || url == "http://steamcommunity.com/" || url == "http://steamcommunity.com/#scrollTop=0") {
			// default page
			webview.executeScript({ code: "document.getElementsByClassName('menuitem supernav username')[0].href" }, function(result) {
				result = new String(result);
				
				if(result == "") {
					isConnected = false;
					
					webview.src = "https://steamcommunity.com/login/home/?goto=0";
				} else {
					profileName = result.split("/")[4];
					isConnected = true;	
			
					webview.executeScript({ code: "document.getElementsByClassName('menuitem supernav username')[0].innerHTML" }, function(result) {				
						document.getElementById('profile_name').innerHTML = result;
					});
					
					webview.src = getFriendsPlayersUrl();
					document.getElementById('friends_client').src = getFriendsUrl();
				}
			});
		} else if (url == getFriendsPlayersUrl()) {
			// handle a started game
			
			// reset current players
			currentPlayers = new Array();
			currentFriends = [];
			
			webview.executeScript({ code: "document.getElementById('memberList').innerHTML" }, function(result) {			
				result = new String(result);
				
				// if no result, change the profileType from profiles (default value) to id
				if(result.length == 0) {
					profileType = "id";
					webview.src = getFriendsPlayersUrl();
					document.getElementById('friends_client').src = getFriendsUrl();
					return;
				}
				
				var tokens = result.split('linkFriend_');
				var number = 0;
				
				// for each player in the lobby
				for(i=1;i<tokens.length;i++) {
					if ( i > 5 ) {
						break;
					}
					
					var connectionTokens = tokens[i].split('href="');
					var linkTokens = connectionTokens[1].split('">');
					var nameTokens = linkTokens[1].split('</a><br>');
					var profileUrl = linkTokens[0];
					var name = nameTokens[0];
					
					number++;
					
					// add a player
					currentPlayers[i - 1] = profileUrl;
					
					// set player name
					setName(i - 1, name, profileUrl);
					
					// set player hours played
					if(!isCachedProfile(profileUrl)) {
						cachePlayers[profileUrl] = {};
						cachePlayers[profileUrl]["name"] = name;
						document.getElementById('player_' + (i - 1)).src = profileUrl + "/games?tab=all";
						document.getElementById('friends_' + (i - 1)).src = profileUrl + "/friends";
						
						console.log("no chache " + name);
					} else {
						setHours(i - 1, cachePlayers[profileUrl]["hours"]);
						
						console.log("chache " + name);
					}
				}			
				
				updatePremades();
				
				// clear the end of players div
				for(i = tokens.length - 1 ; i < 5 ; i++) {					
					setName(i, "", "");
					setHours(i, "");
				}
				
				// if no player, show a message
				if(number == 0) {
					showMessage("Empty lobby");	
				} else {
					hideMessage();
				}
				
				// pulling
				clearTimeout(timer);
				timer = setTimeout(function() {
					webview.src = getFriendsPlayersUrl();
				}, 6000);
			});
			
			
		} else if (url == getFriendsUrl()) {
			// handle no game started
			
			// clear players div
			for(i=0;i<5;i++) {
				setName(i, "", "");
				setHours(i, "");
			}
			
			// show the message
			showMessage("No game started");
			
			// pulling
			clearTimeout(timer);
			timer = setTimeout(function() {
				webview.src = getFriendsPlayersUrl();
			}, 6000);
		} else if (url == "https://steamcommunity.com/login/home/?goto=0") {
			// handle a connection to steam community
			
			// hide message
			hideMessage();
			
			// show the webview
			webview.style.visibility = 'visible';
		} else if (url.match("^http://steamcommunity.com/id/.*/home$") != null) {
			// check if connected to steam community
			webview.executeScript({ code: "document.getElementsByClassName('menuitem supernav username')[0].href" }, function(result) {
				handleConnected(new String(result), "id");
			});
		} else if (url.match("^http://steamcommunity.com/profiles/.*/home$") != null) {
			// check if connected to steam community
			webview.executeScript({ code: "document.getElementsByClassName('menuitem supernav username')[0].href" }, function(result) {				
				handleConnected(new String(result), "profiles");
			});
		} else {
			// redirect to the default page
			webview.src = "http://steamcommunity.com/discussions/";
		}
	}
	
	function handleLoadStopPlayer0(event) {
		handleHoursPlayed(0);
	}
	
	function handleLoadStopPlayer1(event) {
		handleHoursPlayed(1);
	}
	
	function handleLoadStopPlayer2(event) {
		handleHoursPlayed(2);
	}
	
	function handleLoadStopPlayer3(event) {
		handleHoursPlayed(3);	
	}
	
	function handleLoadStopPlayer4(event) {
		handleHoursPlayed(4);
	}
	
	function handleLoadStopFriendsClient(event) {
		document.getElementById('friends_client').executeScript({ code: 'document.getElementById("friendListForm").innerHTML' }, function(result) {
			html = new String(result);
			
			var tokens = html.split('friendBlockLinkOverlay" href="');
			
			var friends = [];
			
			for( i = 1; i < tokens.length ; i++ ) {
				var link = tokens[i].split('">')[0];
				
				friends.push(link);
			}
			
			clientFriends = friends;
		});
	}
	
	function handleLoadStopFriends0(event) {
		handlerFriends(0);
	}
	
	function handleLoadStopFriends1(event) {
		handlerFriends(1);
	}
	
	function handleLoadStopFriends2(event) {
		handlerFriends(2);
	}
	
	function handleLoadStopFriends3(event) {
		handlerFriends(3);
	}
	
	function handleLoadStopFriends4(event) {
		handlerFriends(4);
	}
	
	function handleHoursPlayed(player) {
		document.getElementById('player_' + player).executeScript({ code: 'document.getElementById("game_204300").innerHTML.split("<h5>")[1].split(" ")[0]' }, function(result) {
			hours = new String(result);
			
			// add to the cache
			if(currentPlayers[player] != undefined) {
				cachePlayers["version"] = version;
				cachePlayers[currentPlayers[player]]["hours"] = result;
				cachePlayers[currentPlayers[player]]["time"] = Date.now();
				
				chrome.storage.local.set({'cachePlayers': cachePlayers});
			}
			
			// show hours played
			setHours(player, hours);
			
			// update recently played with panel
			updateRecentlyPlayedWith();
		});
	}
	
	function handlerFriends(player) {
		document.getElementById('friends_' + player).executeScript({ code: 'document.getElementById("memberList").innerHTML' }, function(result) {
			html = new String(result);
			
			var tokens = html.split('friendBlockLinkOverlay" href="');
			
			var friendsList = [];
			
			for( i = 1; i < tokens.length ; i++ ) {
				var link = tokens[i].split('">')[0];
				
				friendsList.push(link);
			}
			
			if(currentPlayers[player] != undefined) {
				cachePlayers[currentPlayers[player]]["friends"] = friendsList;
				
				chrome.storage.local.set({'cachePlayers': cachePlayers});
				
				updatePremades();
			}
		});
	}
	
	function handleConnected(url, type) {
		if(url == "") {
			// no connected
			isConnected = false;
			
			webview.src = "https://steamcommunity.com/login/home/?goto=0";
		} else {
			// connected
			profileType = type;
			profileName = url.split("/")[4];
			isConnected = true;			
			
			webview.executeScript({ code: "document.getElementsByClassName('menuitem supernav username')[0].innerHTML" }, function(result) {				
				document.getElementById('profile_name').innerHTML = result;
				webview.src = getFriendsPlayersUrl();
				document.getElementById('friends_client').src = getFriendsUrl();
			});
		}
	}
	
	function setName(player, name, link) {
		if(name != "") {
			if(!banPlayers.contains(link)) {
				document.getElementById('name_player_' + player).innerHTML = "<a href='" + link + "' target='_blank'>" + name + "</a> <a id='ban_player_" + player + "' href='#'></a>";
				document.getElementById('ban_player_' + player).addEventListener("click", function() {
					if(!banPlayers.contains(link)) {
						banPlayer(link);
						this.innerHTML = "unban";
					} else {
						unbanPlayer(link);
						this.innerHTML = "ban";
					}
				});
			} else {
				document.getElementById('name_player_' + player).innerHTML = "<a href='" + link + "' target='_blank'>" + name + "</a> <a id='ban_player_" + player + "' href='#'></a>";
				document.getElementById('ban_player_' + player).addEventListener("click", function() {
					if(!banPlayers.contains(link)) {
						banPlayer(link);
						this.innerHTML = "unban";
					} else {
						unbanPlayer(link);
						this.innerHTML = "ban";
					}
				});
			}
		} else {
			document.getElementById('name_player_' + player).innerHTML = "";
		}		
	}
	
	function setHours(player, hours) {
		if(hours != "")
			document.getElementById('hours_player_' + player).innerHTML = hours + " hours played";
		else
			document.getElementById('hours_player_' + player).innerHTML = "";
	}
	
	function isCachedProfile(profileUrl) {
		if(cachePlayers[profileUrl] == undefined) {
			return false;
		} else if (cachePlayers[profileUrl]["name"] == undefined || cachePlayers[profileUrl]["hours"] == undefined || cachePlayers[profileUrl]["time"] == undefined || cachePlayers[profileUrl]["friends"] == undefined) {
			return false;
		} else if (Date.now() - cachePlayers[profileUrl]["time"] > 60000*30) {
			return false;
		} else {
			return true;
		}
	}
	
	function updateRecentlyPlayedWith() {
		var html = "";		
		
		for(var link in cachePlayers) {
			if(link != "version") {
				if(cachePlayers[link]["hours"] == "") {
					html = "private profile<br /><br />" + html;
				} else {
					html = cachePlayers[link]["hours"] + " hours played<br /><br />" + html;
				}
				html = "<a href='" + link + "' target='_blank'>" + cachePlayers[link]["name"] + "</a><br />" + html;
			}
		}
		
		recentlyPlayedWith.innerHTML = html;
	}
	
	function updatePremades() {	
		generation = true;
		var friends = [];
		for (var i = 0; i < currentPlayers.length + 1; i++) {
			friends[i] = [];
		}
		
		friends[0][0] = 0;		
		for( i = 0 ; i < currentPlayers.length ; i++) {
			var profileUrl = currentPlayers[i];
			if(clientFriends.contains(profileUrl)) {
				friends[0][i + 1] = 1;
				friends[i + 1][0] = 1;
			} else {
				friends[0][i + 1] = 0;
				friends[i + 1][0] = 0;
			}
		}
		
		for( i = 0 ; i < currentPlayers.length ; i++) {
			var profileUrlI = currentPlayers[i];
			
			for( j = 0 ; j < currentPlayers.length ; j++) {
				var profileUrlJ = currentPlayers[j];
				
				if(isCachedProfile(profileUrlI) && isCachedProfile(profileUrlJ)) {
					if(cachePlayers[profileUrlI]["friends"].contains(profileUrlJ)) {
						friends[i + 1][j + 1] = 1;
					} else {
						friends[i + 1][j + 1] = 0;
					}
				} else {				
					friends[i + 1][j + 1] = 2;
					generation = false;
				}				
			}
		}
		
		for( i = 1 ; i < currentPlayers.length + 1 ; i++) {
			for( j = 1 ; j < currentPlayers.length + 1 ; j++) {
				if(friends[i][j] == 1) {
					friends[j][i] = 1;
				}
			}
		}
		
		if(generation) {
			currentFriends = friends;
			
			document.getElementById('teams_list').innerHTML = "";
			
			// to remove duoq generated thanks to a premade			
			var premades = [];
			var duoqsIndexes = [];
			var duoqs = [];
			
			for ( i = 0 ; i < friends.length ; i++ ) { // for each player
				for ( j = i ; j < friends.length ; j++ ) { // check if each others are friends
					if ( j != i && friends[i][j] == 1) {
						for ( k = j ; k < friends.length ; k++ ) { // if too players are friends, check if a third can be friend
							if ( k != j && k != i && friends[j][k] == 1 && friends[i][k] == 1) {
								// new premade								
								premades.push([i, j, k]);
							}
						}
						
						// if duoq is not generated thanks to a premade
						if (!duoqInPremade(premades, i, j)) {
							duoqsIndexes.push([i, j]);							
						} else {
							console.log('useless duoq');
						}
					}
				}
			}
			
			// premade with duoqs
			for (var i = 0 ; i < duoqsIndexes.length ; i++) {
				for (var j = i ; j < duoqsIndexes.length ; j++) {
					if (j != i) {
						if (duoqsIndexes[j][0] == duoqsIndexes[i][0]) {												
							premades.push([duoqsIndexes[i][0], duoqsIndexes[i][1], duoqsIndexes[j][1]]);
							console.log('rematch !');
						} else if (duoqsIndexes[j][1] == duoqsIndexes[i][0]) {
							premades.push([duoqsIndexes[i][0], duoqsIndexes[i][1], duoqsIndexes[j][0]]);
							console.log('rematch !');
						} else if (duoqsIndexes[j][0] == duoqsIndexes[i][1]) {
							premades.push([duoqsIndexes[i][0], duoqsIndexes[i][1], duoqsIndexes[j][1]]);
							console.log('rematch !');
						} else if (duoqsIndexes[j][1] == duoqsIndexes[i][1]) {
							premades.push([duoqsIndexes[i][0], duoqsIndexes[i][1], duoqsIndexes[j][0]]);
							console.log('rematch !');
						}
					}
				}
			}
			
			// clean duoqs
			for (var i = 0 ; i < duoqsIndexes.length ; i++) {
				if (!duoqInPremade(premades, duoqsIndexes[i][0], duoqsIndexes[i][1])) {
					duoqs.push([duoqsIndexes[i][0], duoqsIndexes[i][1]]);
				}
			}
			
			// show premades
			for (var i = 0 ; i < premades.length ; i++) {
				console.log("PREMADE " + getFriendPlayerName(premades[i][0]) + ", " + getFriendPlayerName(premades[i][1]) + " and " + getFriendPlayerName(premades[i][2]));
				document.getElementById('teams_list').innerHTML += "premade : " + getFriendPlayerName(premades[i][0]) + ", " + getFriendPlayerName(premades[i][1]) + " and " + getFriendPlayerName(premades[i][2]) + "<br />";
			}
			
			// show duoqs
			for (var i = 0 ; i < duoqs.length ; i++) {
				document.getElementById('teams_list').innerHTML += "duoq : " + getFriendPlayerName(duoqs[i][0]) + " and " + getFriendPlayerName(duoqs[i][1]) + "<br />";
			}
			
			console.log('done !');
		}
		
		/*str = "";
		for (var i = 0; i < currentPlayers.length + 1; i++) {
			for (var j = 0; j < currentPlayers.length + 1; j++) {
				str += friends[i][j] + " ";
			}
			str += "\n";
		}
		console.log(str);*/
	}
	
	function duoqInPremade(premades, player1, player2) {
		for (var i = 0; i < premades.length ; i++) {
			if ( premades[i].contains(player1) && premades[i].contains(player2) ) {
				return true;
			}
		}
		
		return false;
	}
	
	function checkVersion() {
		var xhrOnline = new XMLHttpRequest();
		xhrOnline.open('GET', 'https://raw.githubusercontent.com/pierreolivier/steam-teammates-finder/master/app.version', true);
		xhrOnline.onload = function(e) {
			if (this.status == 200) {
				var onlineVersion = this.responseText;
				var xhrLocal = new XMLHttpRequest();
				xhrLocal.open('GET', 'app.version', true);
				xhrLocal.onload = function(e) {
					document.getElementById('version').innerHTML = this.responseText;
					if (this.status == 200) {
						// reset cache
						version = this.responseText;
						if(cachePlayers["version"] != version) {
							console.log("cache resetted");
							cachePlayers = {};
						}
						
						// show update version
						if(onlineVersion != this.responseText) {
							document.getElementById('new_version').innerHTML = "Update (" + onlineVersion + ") !";
						}
					}
				};
				xhrLocal.send();
			}
		};
		xhrOnline.send();
	}
	
	function getProfileUrl() {
		return "http://steamcommunity.com/" + profileType + "/" + profileName;
	}
	
	function getFriendsUrl() {
		return getProfileUrl() + "/friends/";
	}
	
	function getFriendsPlayersUrl() {
		return getProfileUrl() + "/friends/players/";
	}
	
	function getFriendPlayerProfil(player) {
		if(player == 0) {
			return "me";
		} else {
			return currentPlayers[player-1];
		}
	}
	
	function getFriendPlayerName(player) {
		if(player == 0) {
			return "me";
		} else {
			return cachePlayers[currentPlayers[player-1]]["name"];
		}
	}
	
	function showMessage(message) {
		teams.style.display = "none";
		
		document.getElementById('message').innerHTML = message;
		document.getElementById('message').style.visibility = "visible";
	}
	
	function hideMessage() {
		document.getElementById('message').style.visibility = "hidden";
		
		teams.style.display = "initial";
	}
}
	
function banPlayer(profileUrl) {
	if(!banPlayers.contains(profileUrl)) {
		banPlayers.push(profileUrl);
		chrome.storage.local.set({'banPlayers': banPlayers});
	}	
}

function unbanPlayer(profileUrl) {
	var index = banPlayers.indexOf(profileUrl);
	if(index != -1) {
		banPlayers.splice(index, 1);
		chrome.storage.local.set({'banPlayers': banPlayers});
	}
}

Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

Array.prototype.contains = function(obj) {
    var i = this.length;
    while (i--) {
        if (this[i] === obj) {
            return true;
        }
    }
    return false;
}