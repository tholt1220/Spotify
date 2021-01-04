<template>
  <div class = "text-center">
    <!-- <div class="jumbotron">
      <h1>Six Degrees of Spotify</h1>      
      <p>On Average, any two people on earth are connected by six social connections or fewer. Does the same apply for musicians and collaborations?</p>
      <p>Find the link of connections between any 2 artists on Spotify. If one exists, we'll show you the most direct path between the two artists</p>
    </div>       -->
      <form class="row" autocomplete="off" @submit.prevent ="search">
        <div class = "autocomplete col-6 form-group">
            <div class ="artist-pic-wrapper transform" id="src-artist-wrapper">
              <img :src=artistPicture(0) alt="..." class="blank-pic">
              <img :src=artistPicture(0) alt="..." class="artist-pic hidden">
            </div>
            <!-- <label for="artist1">Artist 1</label> -->
            <input id='artist1' class='form-control' placeholder="Artist 1">
            <div class ='autocomplete-items'></div>
        </div>
        <div class = "autocomplete col-6 form-group">
           <div class ="artist-pic-wrapper transform" id="dst-artist-wrapper">
              <img :src=artistPicture(1) alt="..." class="blank-pic">
              <img :src=artistPicture(1) alt="..." class="artist-pic hidden">
            </div>
            <!-- <label for="artist1">Artist 2</label> -->
            <input id='artist2' class='form-control' placeholder="Artist 2">
            <div class ='autocomplete-items'></div>
        </div>
        <div class ="col-12">     
          <button class="btn btn-danger" type="submit" style="display:inline" id="searchButton">Calculate Spotify Distance</button>
          <p id ="artistCount" style="display:none">Searching Spotify... <span></span> (If there's a path we'll find it!)</p>
          <div class="spinner-border spinner-border-sm text-light" id="searchSpinner" role="status" style="margin-left: 5px; margin-top:10px; display:none">
              <span class="sr-only">Loading...</span>
          </div>
        </div>
      </form>
  </div>
</template>

<script>
import spotify  from '../spotify.js'
import {getOr} from 'lodash/fp'

export default {
  name: 'Search',
  data(){
    return{
      token: null,
      queryArtists: [null, null],
      timeout: null,
      blankAvatar: require('../assets/blank.png')
    }
  },
  methods: {
    artistPicture(index){
      return getOr(this.blankAvatar, "artistPicture.url", this.queryArtists[index])
    },

    search(){
      if(!this.queryArtists[0] || !this.queryArtists[1] || this.queryArtists[0].artistId === this.queryArtists[1].artistId)
        return

      //animate artists together
      document.getElementById('src-artist-wrapper').classList.toggle('transformLeft-active')
      document.getElementById('dst-artist-wrapper').classList.toggle('transformRight-active')


      //start search spinner, disable search button
      document.getElementById('searchSpinner').style.display = 'inline-block';
      document.getElementById('searchButton').style.display ="none"
      document.getElementById('artistCount').style.display='inline'
            
      this.computePath()
    },


    computePath(){
      //Run Bidirectional search
      spotify.BDS(this.queryArtists[0], this.queryArtists[1], this.token)
      .then(async res => {
        // this.results = await this.parseResult(res)
        document.getElementById("searchSpinner").style.display = "none";
        
          setTimeout(async () => {
            this.$emit("toggle-search", false)
            this.$emit("results", await this.parseResult(res))
          }, 2000)

       })
    },

  async parseResult(res) {
    let srcArtist, dstArtist, song
    const artistInfo = ({artistId, artistName, artistPicture}) => ({artistId, artistName, artistPicture})
    const songInfo = ({songId, songName}) => ({songId, songName})
    
    if(!res){
        srcArtist = artistInfo(await spotify.getArtist(this.queryArtists[0].artistId, this.token))
        dstArtist = artistInfo(await spotify.getArtist(this.queryArtists[1].artistId, this.token))
        song = null

        return [{srcArtist, dstArtist, song}]
    }

    let parsedRes = []

    
    for(let i = 0; i < res.length - 2; i++){
        srcArtist = artistInfo(await spotify.getArtist(res[i].artistId, this.token))
        dstArtist = artistInfo(await spotify.getArtist(res[i + 1].artistId, this.token))
        song = songInfo(res[i+1])

        parsedRes.push({srcArtist, dstArtist, song})
    }

    return parsedRes

  },
    

    autocomplete(inputElement, index){
      let currentFocus = -1
      inputElement.addEventListener("input",  () => {
        if(this.timeout) clearTimeout(this.timeout)

        this.timeout = setTimeout(() => {
            //remove children from autocomplete-items
            closeAllLists(inputElement)
            
            //search if query is more than 2 characters
            let search = inputElement.value
            if(search.length >= 1){
              //search results
              spotify.searchArtist(search, this.token)
                .then(result => {
                  //create div for each result from the search
                  result.forEach(artist => {
                      let artistElement = document.createElement("div")

                      artistElement.innerHTML = artist.artistName

                      //update the searchbox and close list
                      artistElement.addEventListener("click", () => {
                        inputElement.value = artist.artistName
                        this.queryArtists[index] = artist
                        document.getElementsByClassName('blank-pic')[index].classList.toggle('hidden')
                        document.getElementsByClassName('artist-pic')[index].classList.toggle('hidden')

                        closeAllLists(inputElement)
                      })

                      //add results div to autocomplete-items div
                      document.getElementsByClassName('autocomplete-items')[index].appendChild(artistElement)
                  })
                })
            }
        }, 500)
      })

      inputElement.addEventListener("keydown", e => {
          let listElement = inputElement.parentNode.getElementsByClassName("autocomplete-items")[0]
          if(listElement)
            listElement = listElement.getElementsByTagName('div')

          //arrow down
          if(e.keyCode == 40){
            currentFocus++
            addActive(listElement)
          }
          //enter key 
          if(e.keyCode == 38){
            currentFocus--
            addActive(listElement)
          }

          if(e.keyCode == 13){
            e.preventDefault()
            if (currentFocus > -1){
              if(listElement) listElement[currentFocus].click()
            }
          }
      })

      function closeAllLists(inputElement){
          const autocompleteElement = inputElement.parentNode.getElementsByClassName("autocomplete-items")[0]        
          const n = autocompleteElement.children.length
          for(let i = 0; i < n; i++){
              let artist = autocompleteElement.children[0]
              autocompleteElement.removeChild(artist)
          }
      }

      function removeActive(elements){
          elements.forEach(element => {
            element.classList.remove('autocomplete-active')
          })
      }
    
      function addActive(elements){
          removeActive(elements)

          //wraparound
          if(currentFocus < 0) currentFocus = elements.length - 1
          if(currentFocus >= elements.length) currentFocus = 0

          elements[currentFocus].classList.add('autocomplete-active')
      }
    
    },

    delayedSearch(inputElement, index){
        if(this.timeout){
          clearTimeout(this.timeout)
        }
        this.timeout = setTimeout(() => {
          this.autocomplete(inputElement, index)
        }, 500)
    }
  },

  mounted(){
    this.autocomplete(document.getElementById('artist1'), 0)
    this.autocomplete(document.getElementById('artist2'), 1)
    document.getElementById('searchButton').style.display ="inline"
    document.getElementById('artistCount').style.display='none'
    document.getElementById('artist1').value=''
    document.getElementById('artist2').value=''

    spotify.getToken().then(token => this.token = token)
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style>
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}

form .form-control:focus{
  border-color: #ced4da;
  box-shadow: none;
}

.autocomplete{
  position: relative;
  display: inline-block;
}

.autocomplete-active{
  background-color: grey !important;
}

.autocomplete-items {
  position: absolute;
  border: 1px solid white;
  border-bottom: none;
  border-top: none;
  z-index: 99;
  /*position the autocomplete items to be the same width as the container:*/
  top: 100%;
  left: 0;
  right: 0;
  width: 70%;
  margin: auto;
}

.autocomplete-items div {
  padding: 10px;
  cursor: pointer;
  background-color: #cee1e2;
  border-bottom: 1px solid white;
}

.autocomplete-items div:hover {
  /*when hovering an item:*/
  background-color: #e63946;
  color: white;
}

.artist-pic-wrapper {
  /* margin: auto; */
  background: #e63946;
  border: 6px solid  #6d1f2588;
  /* height: 300px; */
  width: 40%;
  position: relative;
  padding-bottom: 40%;;
  text-align:center;
  border-radius: 50%;
  margin-bottom: 15px;
  margin-right: calc(30%);
  margin-left: calc(30%);
}

button{
    background-color: #e63946 !important;
}

.artist-pic, .blank-pic {
    height: 100% ; 
    width: 100%;
    border-radius: 50%;
    object-fit:cover;
    position: absolute;
    left: 0;
    opacity: 1;
    transition: all 1s ease-out;
}



.transformLeft-active{
      /* right: 50%;  */
      margin-right: calc(-10%);
      margin-left: auto;
      opacity: 0.9;
      animation: spin 12s linear 1s infinite;

}

.transform{
  -webkit-transition: all 1s ease-out;
  -moz-transition: all 1s ease-out;
  -o-transition: all 1s ease-out;
  -ms-transition: all 1s ease-out;
    transition: all 1s ease-out;
}

.transformRight-active{
      /* left: 50%;  */
      margin-left: calc(-10%);
      margin-right: auto;
      opacity: 0.9;
      animation: spin 13s linear 1s infinite reverse;
}

.hidden{
  opacity: 0;
  transition: all 0s ease-out;

}

@-moz-keyframes spin { 100% { -moz-transform: rotate(360deg); } }
@-webkit-keyframes spin { 100% { -webkit-transform: rotate(360deg); } }
@keyframes spin { 100% { -webkit-transform: rotate(360deg); transform:rotate(360deg); } }

form input{
  margin: auto !important;
  width: 75% !important;
  border: none !important;
  border-bottom: 1px solid black !important;
  background-color:#a8dadc !important;
  text-align:center
}
.jumbotron {
  background-color: #1d3557 !important;
  color:white; 
  margin-left: -15px !important;
  margin-right: -15px !important;
  padding: 1rem !important;
}
</style>
