var isLoading = false;
var url = "";
var isConnected = false;
var profileType = "profiles";
var profileName = "";
var timer;

onload = function() {
	var webview = document.querySelector('webview');
	
	webview.addEventListener('loadstart', handleLoadStart);
	webview.addEventListener('loadstop', handleLoadStop);
	
	document.getElementById("disconnect").onclick = function () {
		clearTimeout(timer);
		webview.src = "https://steamcommunity.com/login/logout";
	};
	
	document.getElementById('player_0').addEventListener('loadstop', handleLoadStopPlayer0);
	document.getElementById('player_1').addEventListener('loadstop', handleLoadStopPlayer1);
	document.getElementById('player_2').addEventListener('loadstop', handleLoadStopPlayer2);
	document.getElementById('player_3').addEventListener('loadstop', handleLoadStopPlayer3);
	document.getElementById('player_4').addEventListener('loadstop', handleLoadStopPlayer4);
	
	showMessage("Initialization...");
	
	function handleLoadStart(event) {
		isLoading = true;	
		
		webview.style.visibility = "hidden";
		
		if(event.url == "https://steamcommunity.com/login/logout") {
			showMessage("Disconnection...");
		}
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
					
					webview.src = getFriendsPlayersUrl();
				}
			});
		} else if (url == getFriendsPlayersUrl()) {
			// started game
			webview.executeScript({ code: "document.getElementById('memberList').innerHTML" }, function(result) {			
				result = new String(result);
				
				if(result.length == 0) {
					profileType = "id";
					webview.src = getFriendsPlayersUrl();
					return;
				}
				
				var tokens = result.split('linkFriend_');
				var number = 0;
				
				for(i=1;i<tokens.length;i++) {
					var connectionTokens = tokens[i].split('href="');
					var linkTokens = connectionTokens[1].split('">');
					var nameTokens = linkTokens[1].split('</a><br>');
					var profileUrl = linkTokens[0];
					var name = nameTokens[0];
					number++;
					
					setName(i - 1, name, profileUrl);
					document.getElementById('player_' + (i - 1)).src = profileUrl + "/games?tab=all";
				}
				
				for(i=tokens.length - 1;i<5;i++) {
					setName(i, "", "");
					setHours(i, "");
				}
				
				if(number == 0) {
					showMessage("Empty lobby");	
				} else {
					hideMessage();
				}
				
				clearTimeout(timer);
				timer = setTimeout(function() {
					webview.src = getFriendsPlayersUrl();
				}, 6000);
			});
			
			
		} else if (url == getFriendsUrl()) {
			// no started game
			for(i=0;i<5;i++) {
				setName(i, "", "");
				setHours(i, "");
			}
		
			showMessage("Awesomenauts is not started<br /><a href='steam://run/204300' target='_blank'>Launch</a>");
			
			clearTimeout(timer);
			timer = setTimeout(function() {
				webview.src = getFriendsPlayersUrl();
			}, 6000);
		} else if (url == "https://steamcommunity.com/login/home/?goto=0") {
			// connection to steam community
			hideMessage();
			webview.style.visibility = 'visible';
		} else if (url.match("^http://steamcommunity.com/id/.*/home$") != null) {
			// check if connected to steam community
			webview.executeScript({ code: "document.getElementsByClassName('menuitem supernav username')[0].href" }, function(result) {
				result = new String(result);
				
				if(result == "") {
					isConnected = false;
					
					webview.src = "https://steamcommunity.com/login/home/?goto=0";
				} else {
					profileType = "id";
					profileName = result.split("/")[4];
					isConnected = true;
					
					webview.src = getFriendsPlayersUrl();
				}
			});
		} else if (url.match("^http://steamcommunity.com/profiles/.*/home$") != null) {
			// check if connected to steam community
			webview.executeScript({ code: "document.getElementsByClassName('menuitem supernav username')[0].href" }, function(result) {
				result = new String(result);
				
				if(result == "") {
					isConnected = false;
					
					webview.src = "https://steamcommunity.com/login/home/?goto=0";
				} else {
					profileType = "profiles";
					profileName = result.split("/")[4];
					isConnected = true;
					
					webview.src = getFriendsPlayersUrl();
				}
			});
		} else {
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
			result = new String(result);
			setHours(player, result);
		});
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
	
	function getFriendsUrl() {
		return "http://steamcommunity.com/" + profileType + "/" + profileName + "/friends/";
	}
	
	function getFriendsPlayersUrl() {
		return "http://steamcommunity.com/" + profileType + "/" + profileName + "/friends/players/";
	}
	
	function showMessage(message) {
		document.getElementById('message').innerHTML = message;
		document.getElementById('message').style.visibility = "visible";
	}
	
	function hideMessage() {
		document.getElementById('message').style.visibility = "hidden";
	}
}