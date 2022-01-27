var redirect_uri = 'https://spotimasher.web.app/';

//Confirgured for spotify test app
var client_id = 'client ID';
var client_secret = 'client Secret';

//Spotify endpoints
const authorize = "https://accounts.spotify.com/authorize"
const token = "https://accounts.spotify.com/api/token";
const playlist = "https://api.spotify.com/v1/me/playlists";
const devices = "https://api.spotify.com/v1/me/player/devices";
const play = "https://api.spotify.com/v1/me/player/play";
const pause = "https://api.spotify.com/v1/me/player/pause";
const next = "https://api.spotify.com/v1/me/player/next";
const previous = "https://api.spotify.com/v1/me/player/previous";
const player = "https://api.spotify.com/v1/me/player";
const tracks = "https://api.spotify.com/v1/playlists/{{PlaylistId}}/tracks";
const currentlyPlaying = "https://api.spotify.com/v1/me/player/currently-playing";
const shuffle = "https://api.spotify.com/v1/me/player/shuffle";


//Tokens
var access_token;
var refresh_token;
var code

//Playlist Sample Base
var playlistSampleLimit = 50;
var artistArrOutput = [];

var genres = [];
var genreArr = [];
var songIdArr = [];
var playlist1 = false;
var userID = '';
var isAuthed = false;
var artists1;
var artists2;
var playlistOutUrl = '';

var debugMode = false;

/*Spotimasher flow

Parse playlist ID from link -- getPlaylistID()
Use playlist ID to make api call to retrieve playlist songs -- getPlaylistItems()
Retrieve artists ID's from songs -- getArtistIDs()
Sort artist IDs by ascending order and retrieve top 5 genres -- sortGenres()
Use the top 5 artists to get a list of 30 reccomended songs -- getReccomendations()
Create an array with the song ID's of all the songs in the reccomended list -- getSongIDs()
Sort the artists in order of most appearances and removes all but top 5 artists -- sortArtists()
Preform an API call to generate an array of songs from the top 5 genres -- createPlaylist()
Extract playlist ID and create an array of the song URI's -- handleCreatePlaylist()
Add the songs to the playlist -- handleCreatePlaylist()

*/

function mashPlaylists(url1, url2) {
    genreArr = [];
    genres = [];
    playlist1 == false;

    if (checkValues() == false) //checks for errors
    {
        return;
    }

    getPlaylistItems(url1);
    getPlaylistItems(url2);
    getUserID()
}

function getPlaylistItems(playlistUrl) {
    let playlist_ID = getPlaylistID(playlistUrl)
    let endpoint = 'https://api.spotify.com/v1/playlists/' + playlist_ID + '/tracks'; //Builds endpoint url with playlist ID
    let body;

    callApi('GET', endpoint, body, handlePlaylistItems)//API call to get playlist info
}

function handlePlaylistItems() {
    let songArr = [];
    let artistIdArr = [];
    let playlist = this.response;

    playlist = JSON.parse(playlist);
    songArr = playlist.items;

    artistIdArr = getArtistIDs(songArr);
    artistIdArr = sortArtistIDs(artistIdArr)
}

function getUserID() {
    let body;

    callApi('GET', 'https://api.spotify.com/v1/me', body, handleUserID)//API call to receive user info. used to get ID for playlist creation
}

function handleUserID() {
    let data = JSON.parse(this.responseText);

    userID = data.id;
}

function getPlaylistID(playlistUrl) {
    let tmp;
    let tmp2;
    let playlist_ID;

    if (playlistUrl.includes('?')) { 
        tmp = playlistUrl.indexOf('playlist/');
        tmp += 9;
        tmp2 = playlistUrl.indexOf('?');
        playlist_ID = playlistUrl.slice(tmp, tmp2);
    }
    else {
        tmp = playlistUrl.indexOf('playlist/');
        tmp += 9;
        playlist_ID = playlistUrl.slice(tmp, playlistUrl.length);
    }

    return playlist_ID;
}

function getArtistIDs(songArr) {
    let artistIdArr = [];
    let artistArr = [];

    songArr.forEach(element => {
        if (element.track != null) //checks to make sure track is valid... Thanks spotify api <3
        {
            let track = element.track;

            if (track.hasOwnProperty('artists')) { //Checks to make sure track has artist property, local tracks do not have artist property.

                artistArr = track.artists;

                artistArr.forEach(element => {
                    artistIdArr.push(element.id);
                });
            }
        }
    });

    return artistIdArr;
}

function sortArtistIDs(arr) {
    let artistList = {}
    let sortArr = [];

    //creates genre object with count of genres
    arr.forEach((element) => {
        artistList[element] = (artistList[element] || 0) + 1;
    });

    for (const key in artistList) {
        sortArr.push([key, artistList[key]]);
    }


    //Sorts array in ascending order of artist appearances
    sortArr.sort(function (a, b) {
        return a[1] - b[1];
    });

    getTopGenres(sortArr);

}

function getTopGenres(arr) {
    let topArtists = [];

    if (playlist1 == false) {
        artists1 = arr.slice(-3);
        playlist1 = true;
        return;
    }

    if (playlist1 == true) {
        artists2 = arr.slice(-3);
    }

    arr = artists1.concat(artists2);
    arr = arr.slice(-5);

    arr.forEach(element => {
        topArtists.push(element[0]);
    });

    console.log('Generating playlists from the following artist seeds: ' + topArtists);
    getReccomendations(topArtists);
}

function getReccomendations(arr) {
    let body;

    //Builds a uri encoded list of artist seeds
    arr = arr.join(',');
    arr = encodeURIComponent(arr);

    url = 'https://api.spotify.com/v1/recommendations?limit=30&market=CA&seed_artists=' + arr//Builds endpoint url with list of artist seeds

    callApi('GET', url, body, handleReccomendations);
}

function handleReccomendations() {
    let songArr = [];
    let playlist = JSON.parse(this.response)

    songArr = playlist.tracks;
    getPlaylistIDs(songArr)
}

function getPlaylistIDs(playlist) {

    playlist.forEach(element => {
        songIdArr.push(element.uri);
    });

    createPlaylist()
}

function createPlaylist() {
    let playlistName = document.getElementById('playlistName').value;
    let playlistDesc = document.getElementById('playlistDesc').value;
    let public = false;
    let url = ' https://api.spotify.com/v1/users/' + userID + '/playlists' //Builds url endpoint for playlist creation

    //Constructing body with playlist info
    let body = 
    {
        "name": playlistName,
        "description": playlistDesc,
        "public": public
    }
    body = JSON.stringify(body);

    callApi('POST', url, body, handleNewPlaylist)//API call to create new playlist 
}

function handleNewPlaylist() {
    let playlist = JSON.parse(this.response);
    let playlistID = playlist.id
    let body;

    //constructs uri encoded list of songs to add to playlist
    let uriArr = songIdArr.join(',');
    uriArr = encodeURIComponent(uriArr);

    playlistOutUrl = playlist.external_urls.spotify;

    url = 'https://api.spotify.com/v1/playlists/' + playlistID + '/tracks?uris=' + uriArr;//Builds url endpoint for adding songs to playlist

    callApi('POST', url, body, handleAddSongsToPlaylist)//API call to add songs to playlist

}

function handleAddSongsToPlaylist() {
    showModal();
}

function randomBtwn(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

//UI
function updateUI() {
    showAuth();
}

function showAuth() {
    if (isAuthed == true) {
        document.getElementById('auth').style.display = 'none';
        document.getElementById('main').style.display = 'grid';
    }
    else {
        document.getElementById('auth').style.display = 'grid';
        document.getElementById('main').style.display = 'none';
    }
}

function showModal() {
    document.getElementById('playlistCreatedModal').style.display = 'grid';
}

function openPlaylist() {
    window.open(playlistOutUrl);
}

function checkValues() {
    let playlist1input = document.getElementById('playlistURL1');
    let playlist2input = document.getElementById('playlistURL2');
    let playlistName = document.getElementById('playlistName');
    let playlistDesc = document.getElementById('playlistDesc');
    let isErrorFree = true;

    if (playlist1input.value === '') {
        document.getElementById('playlist1error').innerHTML = 'Please input a valid playlist link';
        isErrorFree = false;
    }

    if (playlist2input.value === '') {
        document.getElementById('playlist2error').innerHTML = 'Please input a valid playlist link';
        isErrorFree = false;
    }

    if (playlistName.value === '') {
        document.getElementById('playlistNameError').innerHTML = 'Please input a valid playlist name';
        isErrorFree = false;
    }

    if (playlistDesc.value === '') {
        document.getElementById('playlistDescError').innerHTML = 'Please input a valid playlist desc';
        isErrorFree = false;
    }

    return isErrorFree;
}

//Authorization

function onPageLoad() {
    if (window.location.search.length > 0) {
        handleRedirect();
    }

    updateUI();
}

function handleRedirect() {
    let code = getCode();

    fetchAccessToken(code);
    window.history.pushState("", "", redirect_uri); // remove param from url
}

function getCode() {
    let code = null;

    const queryString = window.location.search;
    if (queryString.length > 0) {
        const urlParams = new URLSearchParams(queryString);
        code = urlParams.get('code')
    }
    return code;
}

function requestAuthorization() {
    let url = authorize;

    localStorage.setItem("client_id", client_id);
    localStorage.setItem("client_secret", client_secret);

    url += "?client_id=" + client_id;
    url += "&response_type=code";
    url += "&redirect_uri=" + encodeURI(redirect_uri);
    url += "&show_dialog=true";
    url += "&scope=user-read-private user-read-email user-modify-playback-state user-read-playback-position user-library-read streaming user-read-playback-state user-read-recently-played playlist-read-private playlist-modify-public playlist-modify-private";
    window.location.href = url; // Show Spotify's authorization screen
}

function fetchAccessToken(code) {
    let body = "grant_type=authorization_code";
    body += "&code=" + code;
    body += "&redirect_uri=" + encodeURI(redirect_uri);
    body += "&client_id=" + client_id;
    body += "&client_secret=" + client_secret;
    callAuthorizationApi(body);
}

function refreshAccessToken() {
    let body = "grant_type=refresh_token";

    refresh_token = localStorage.getItem("refresh_token");
    body += "&refresh_token=" + refresh_token;
    body += "&client_id=" + client_id;
    callAuthorizationApi(body);
}

function callAuthorizationApi(body) {
    let xhr = new XMLHttpRequest();

    xhr.open("POST", token, true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.setRequestHeader('Authorization', 'Basic ' + window.btoa(client_id + ":" + client_secret));
    xhr.send(body);
    xhr.onload = handleAuthorizationResponse;
}

function handleAuthorizationResponse() {
    if (this.status == 200) {
        let data = JSON.parse(this.responseText);
        data = JSON.parse(this.responseText);
        isAuthed = true;
        if (data.access_token != undefined) {
            access_token = data.access_token;
            localStorage.setItem("access_token", access_token);
        }
        if (data.refresh_token != undefined) {
            refresh_token = data.refresh_token;
            localStorage.setItem("refresh_token", refresh_token);
        }
        onPageLoad();
    }
    else {
        alert(this.responseText);
    }
}

function callApi(method, url, body, callback) {
    let xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', 'Bearer ' + access_token);
    xhr.send(body);
    xhr.onload = callback;
}