// import axios from 'axios'
// import qs from 'querystring'
// import {map, pipe, get, flatten, uniqBy, remove, assign} from 'lodash/fp'
const axios = require('axios')
const qs = require('querystring')
const {map, pipe, get, flatten, uniqBy, remove, assign}= require('lodash/fp') 

function delay(t, v) {
    return new Promise(function(resolve) { 
        setTimeout(resolve.bind(null, v), t)
    });
 }
class Queue{
    constructor(elements = []){
        this.elements = elements
    }
    
    enqueue(e){ return this.elements.push(e)}
    dequeue(){ return this.elements.shift()}
    isEmpty(){ return this.elements.length == 0}
    length() {return this.elements.length}
    fetch(id) {
        for(let i = 0; i < this.elements.length; i++){
            if(this.elements[i].artist.artistId == id)
                return this.elements[i].path
        }
        return null
    }
}

async function getToken(){
    const body = {
        grant_type: 'client_credentials'
    }
    
    const config = {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: 'Basic NDE3OThmMDVmZjY4NDU5ODg1YWFmMzUyNDgyNDE4NTU6NDEzYThlZWE1M2FkNGQ0ZmI2MThiYTIxZGUwNzc0YWE='
        },
    }
        
    let response = await axios.post('https://accounts.spotify.com/api/token', qs.stringify(body), config)
    return response.data.access_token
}

function searchArtist(name,token){
    const  config = {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },

        params: {
            q: name,
            type:'artist',
            limit: 7
        }
    }

    return axios.get(`https://api.spotify.com/v1/search`, config)
        .then(res => res.data.artists.items.map(item => ({artistId: item.id, artistName: item.name, artistPicture: item.images[0]})))
        // .then(res => (//{artistId: res.data.artists.items[0].id, artistName: res.data.artists.items[0].name}))
        .catch(e => {
            const timeout = parseInt(e.response.headers['retry-after'])

            return delay(1000*timeout)
            .then(() => searchArtist(name, token))        
        })
}

function getArtist(id,token){
    const  config = {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        }
    }

    return axios.get(`https://api.spotify.com/v1/artists/${id}`, config)
        .then(res => {return {artistName: res.data.name, artistId: res.data.id, artistPicture: res.data.images[0]}})
        .catch(e => {
            const timeout = parseInt(e.response.headers['retry-after'])

            return delay(1000*timeout)
                .then(() => getArtist(id, token))
            })
}

//return all of an artists albums and singles
function getAlbumsFromArtist(artistId, token){
    const  config = {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },

        params: {
            include_groups:'album,single,appears_on,compilation',
            market:'ES',
            limit: 50
        }
    }

    return axios.get(`https://api.spotify.com/v1/artists/${artistId}/albums`, config)
        .then(response => pipe(
                get('data.items'),
                map(item => item.id)
            )(response)
        )
        .catch(e => {
            const timeout = parseInt(e.response.headers['retry-after'])
            // console.log(`getAlbumsFromArtist: ${timeout}`)

            return delay(1000*timeout)
                .then(() => getAlbumsFromArtist(artistId, token))   
            })
    }
//from album/albums, return any songs with features
function getArtistsFromAlbum(artistId, albumId, token){
    const  config = {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },

        params: {
            ids: albumId
        }
    }

    return axios.get(`https://api.spotify.com/v1/albums/`, config)
        .then(response => pipe(
                get('data.albums'), //get albums
                map(album => album.tracks.items), //get tracks
                flatten,
                remove(entry => { //if X appears on collection, remove songs that aren't by X
                    for(let i = 0; i < entry.artists.length; i++)
                        if(entry.artists[i].id == artistId)
                        {
                            return false
                        }
                    return true
                }),
                map(({artists, name, id}) => {//array of metadata for each track
                    return artists.map((artist => {
                            return assign({songName: name, songId: id}, artist)
                    }))
                }
                ),
                flatten,
                map(artist => ({artistName: artist.name, artistId: artist.id, songName: artist.songName, songId: artist.songId})),
                uniqBy(object => object.artistName)
            )(response)
        )
        .catch(e => {
            const timeout = parseInt(e.response.headers['retry-after'])
            // console.log(`getArtistsFromAlbum: ${timeout}`)
            return delay(1000*timeout)
                .then(() => getArtistsFromAlbum(artistId, albumId, token))
        })
}

//return all songs that feature another artist, given an artist
function getCollaborators(artistId, token){
    return getAlbumsFromArtist(artistId, token)
    .then( albums =>  {
        let n = albums.length
        let promises = []
        for(let i = 0; i < n; i+= 20){ //Spotify API only allows for 20 albums at a time
            promises.push(getArtistsFromAlbum(artistId, albums.slice(i, i+ 20).join(), token))
        } 
        return promises
    })
    .then(promises => Promise.all(promises))
    .then(flatten)
    .then(remove(entry => entry.artistId == artistId))
}

// //queue of artist id's, set of id's, target id, path this far
// async function BFS(queue, visited, target, token){
//     if(queue.isEmpty())
//         return 
    
//     expandNode = queue.dequeue()

//     visited.add(expandNode.artist.artistId)
//     neighbors = await getCollaborators(expandNode.artist.artistId, token)
//     for(let i = 0; i < neighbors.length; i++){
//         // console.log(`ADDING ${neighbors[i].artistName}`)
//         const artist = neighbors[i]

//         if(artist.artistId == target){
//             return expandNode.path.concat(artist)
//         }
//         else if(!(visited.has(artist.artistId))){
//             queue.enqueue({artist, path: expandNode.path.concat(artist)})
//         }
//     }

//     return await BFS(queue, visited, target, token)
// }

async function BDS(src, dst, token){
    let counter = 0
    let queueSrc = new Queue()
    let visitedSrc = new Set([src.artistId])
    queueSrc.enqueue({artist:src, path: [src]})

    let queueDst = new Queue()
    let visitedDst = new Set([dst.artistId])
    queueDst.enqueue({artist:dst, path: [dst]})
    const htmlElement = document.getElementById('artistCount').getElementsByTagName('span')[0]

    //if one queue is empty, then there is no path (since connections go both ways)
    while(!queueSrc.isEmpty() && !queueDst.isEmpty()){
        if(!queueSrc.isEmpty()){
            let expandNodeSrc = queueSrc.dequeue()
            // console.log(`Expanding ${expandNodeSrc.artist.artistName} SRC`)
            if(expandNodeSrc.artist.artistId == dst.artistId || queueDst.fetch(expandNodeSrc.artist.artistId)){
                return expandNodeSrc.path.concat(queueDst.fetch(expandNodeSrc.artist.artistId))
            }
            let neighborsSrc = await getCollaborators(expandNodeSrc.artist.artistId, token)
            let nSrc = neighborsSrc.length
            for(let i = 0; i < nSrc; i++){
                counter += 1
                if(counter % 500 == 0){
                    // console.log(`scanned ${counter} artists`)
                    htmlElement.innerHTML = `Scanned ${counter} artists`
                }
                let artist = neighborsSrc[i]
                
                if(artist.artistId == dst.artistId){
                    return expandNodeSrc.path.concat(artist).concat([dst])
                }

                else if(!visitedSrc.has(artist.artistId))
                {
                    // console.log(`Adding ${artist.artistName}`)
                    visitedSrc.add(artist.artistId)
                    queueSrc.enqueue({artist, path: expandNodeSrc.path.concat(artist)})
                }
            }
        }
        if(!queueDst.isEmpty()){
            let expandNodeDst = queueDst.dequeue()
            // console.log(`Expanding ${expandNodeDst.artist.artistName} DST`)
            if(expandNodeDst.artist.artistId == src.artistId || queueSrc.fetch(expandNodeDst.artist.artistId)){
                // return expandNodeDst.path.concat(queueSrc.fetch(expandNodeDst.artist.artistId))
                return queueSrc.fetch(expandNodeDst.artist.artistId).concat(expandNodeDst.path)//.reverse())
            }
            let neighborsDst = await getCollaborators(expandNodeDst.artist.artistId, token)
            let nDst = neighborsDst.length
            for(let j = 0; j < nDst; j++){
                counter += 1
                if(counter % 500 == 0){
                    // console.log(`scanned ${counter} artists`)
                    htmlElement.innerHTML = `Scanned ${counter} artists`
                }
                let artist = neighborsDst[j]
                
                if(artist.artistId == src.artistId){
                    artist = assign(artist, {
                        artistName: expandNodeDst.artist.artistName,
                        artistId: expandNodeDst.artist.artistId
                    })
                    return [src].concat([artist].concat(expandNodeDst.path))//.concat(artist))//.concat(src)
                }
                else if(!visitedDst.has(artist.artistId))
                {
                    // console.log(`Adding ${artist.artistName}`)
                    visitedDst.add(artist.artistId)
                    //display expanded node, since path goes backwards
                    let artistPath = assign(artist, {
                        artistName: expandNodeDst.artist.artistName,
                        artistId: expandNodeDst.artist.artistId,
                    })
                    queueDst.enqueue({artist, path: [artistPath].concat(expandNodeDst.path)})
                }
            }
        }
    }

    return null
}





module.exports = {
    getArtist,
    getToken, 
    BDS,
    searchArtist
}