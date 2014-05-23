var isLoading = false;
var isConnected = false;
var url = "";
var version = "";

var profileType = "profiles";
var profileName = "";

var timer;

var currentPlayers = new Array();
var cachePlayers = {};

onload = function() {
	showMessage("Initialization...");

	var webview = document.querySelector('webview');
	var players = document.getElementById("players");
	var recentlyPlayedWith = document.getElementById("recently_played_with_panel");
	
	webview.addEventListener('loadstart', handleLoadStart);
	webview.addEventListener('loadstop', handleLoadStop);
	
	document.getElementById('player_0').addEventListener('loadstop', handleLoadStopPlayer0);
	document.getElementById('player_1').addEventListener('loadstop', handleLoadStopPlayer1);
	document.getElementById('player_2').addEventListener('loadstop', handleLoadStopPlayer2);
	document.getElementById('player_3').addEventListener('loadstop', handleLoadStopPlayer3);
	document.getElementById('player_4').addEventListener('loadstop', handleLoadStopPlayer4);
	
	document.getElementById('lobby').onclick = function () {
		recentlyPlayedWith.style.visibility = "hidden";
		players.style.visibility = "visible";
		document.getElementById('message_box').style.display = "initial";
	}
	
	document.getElementById('recently_played_with').onclick = function () {		
		players.style.visibility = "hidden";
		document.getElementById('message_box').style.display = "none";
		recentlyPlayedWith.style.visibility = "visible";
	}
	
	document.getElementById("disconnect").onclick = function () {
		clearTimeout(timer);
		
		webview.src = "https://steamcommunity.com/login/logout";
		
		showMessage("Disconnection...");
	};
	
	chrome.storage.local.get('cachePlayers', function(items) {
		cachePlayers = items['cachePlayers'];
		
		updateRecentlyPlayedWith();
		
		console.log(cachePlayers);
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
				}
			});
		} else if (url == getFriendsPlayersUrl()) {
			// handle a started game
			
			// reset current players
			currentPlayers = new Array();
			
			webview.executeScript({ code: "document.getElementById('memberList').innerHTML" }, function(result) {			
				result = new String(result);
				
				// if no result, change the profileType from profiles (default value) to id
				if(result.length == 0) {
					profileType = "id";
					webview.src = getFriendsPlayersUrl();
					return;
				}
				
				var tokens = result.split('linkFriend_');
				var number = 0;
				
				// for each player in the lobby
				for(i=1;i<tokens.length;i++) {
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
						
						console.log("no chache " + name);
					} else {
						setHours(i - 1, cachePlayers[profileUrl]["hours"]);
						
						console.log("chache " + name);
					}
				}
				
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
			// handle awesomenauts not started
			
			// clear players div
			for(i=0;i<5;i++) {
				setName(i, "", "");
				setHours(i, "");
			}
			
			// show the message
			showMessage("Awesomenauts is not started<br /><a href='steam://run/204300' target='_blank'>Launch</a>");
			
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
			});
		}
	}
	
	function setName(player, name, link) {
		document.getElementById('name_player_' + player).innerHTML = "<a href='" + link + "' target='_blank'>" + name + "</a>";
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
		} else if (Date.now() - cachePlayers[profileUrl]["time"] > 60000) {
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
	
	function checkVersion() {
		var xhrOnline = new XMLHttpRequest();
		xhrOnline.open('GET', 'https://raw.githubusercontent.com/pierreolivier/awesomenauts-teammates-finder/master/app.version', true);
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
	
	function showMessage(message) {
		document.getElementById('message').innerHTML = message;
		document.getElementById('message').style.visibility = "visible";
	}
	
	function hideMessage() {
		document.getElementById('message').style.visibility = "hidden";
	}
}