<template>
    <div>
        <div id ="results" v-if="$props.results.length">
            <div v-if="$props.results[0].song">                
                <div class = "fadeIn">
                    <h4>{{overview}}</h4>
                    <h2><strong>{{$props.results.length}}</strong></h2>
                </div>
            
            <!-- <div class = "row"> -->
                <div v-bind:key="result.song.songId" v-for="result in $props.results" class="fadeIn">
                    <div class="row text-center">
                        <img :src="artistPicture(result.srcArtist)" class="src-artist artist">
                        <img :src="artistPicture(result.dstArtist)" class="dst-artist artist">
                    </div>
                    <div class ="row artist-text">
                        <p><strong>{{result.srcArtist.artistName}}</strong> and <strong>{{result.dstArtist.artistName}}</strong>
                        <br>
                        Appear on <strong>"{{result.song.songName}}"</strong> together.</p>
                    </div>
                    <iframe :src=embedUrl(result.song.songId) width="300" height="80" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>    
                </div>
            <!-- </div> -->

                <button class="btn btn-danger fadeIn" @click="toggleSearch(true)">Try with other artists</button>
            </div>
            <div v-else-if="results.length === 1">
                <h4 class="fadeIn">There is no link between {{results[0].srcArtist.artistName}} and {{results[0].dstArtist.artistName}}. Their Spotify Distance is </h4>
                <h2><strong>Infinity</strong></h2>
                <p class ="msg fadeIn">This is most likely because one of the artists has not collaborated with anybody (yet).</p>
                <p class ="msg fadeIn">Furthermore, bands do not list each member as artists.</p>
                <p class ="msg fadeIn">For example, Paul McCartney and Ringo Starr were both members of the Beatles, but both have few solo projects with other artists.</p>
                <button class="btn btn-danger fadeIn" @click="toggleSearch(true)">Try again with other artists</button>
            </div>
        </div>

    </div>
</template>


<script>

import {getOr} from "lodash/fp"

export default {
    name: "result",
    props: ["results"],
    data(){
        return{
            defaultAvatar: require('../assets/default-avatar.png')
        }
    },
    computed: {
    overview() {
        return `The Spotify Distance between ${this.$props.results[0].srcArtist.artistName} and ${this.$props.results[this.$props.results.length -1].dstArtist.artistName} is`
    }
  },
    methods:{
        artistPicture(src){
            return getOr(this.defaultAvatar, "artistPicture.url", src)
        },
        embedUrl(songId){ return `https://open.spotify.com/embed/track/${songId}`},
        toggleSearch(b){ this.$emit("toggle-search", b)}
    },
    updated(){
        let fadeInItems = document.getElementsByClassName('fadeIn')
        for(let i = 0; i < fadeInItems.length; i++){
            let element = fadeInItems[i]

            setTimeout(() => {
                element.classList.add('fadeIn-active')
            }, i * 1000) 
        }
    }
}
</script>

<style scoped>
    .artist{
        height: 150px;
        width: 150px;
        border-radius: 50%;
        margin:auto;
        margin-top: 50px;
        border: 1px solid #e63946;
    }

    .src-artist{
        /* position: absolute; */
        right: 50%;
        margin-right: -15px;
        opacity: 0.9;
    }
    .dst-artist{
        /* position: absolute; */
        left: 50%;
        margin-left: -15px;
        opacity: .9;
    }

    .artist-text p{
        margin: auto;
        margin-bottom: 15px;
    }
    iframe{
        margin-bottom: 30px;
        border: 5px solid #e63946;
    }

    .fadeIn{
        opacity: 0;
        -webkit-transition: all 1s ease-out;
        -moz-transition: all 1s ease-out;
        -o-transition: all 1s ease-out;
        -ms-transition: all 1s ease-out;
        transition: all 1s ease-out;
    }

    .fadeIn-active{
        opacity: 1;
    }

    #results{
        padding-bottom: 30px;
    }

    .msg{
        padding-bottom: 15px
    }
</style>