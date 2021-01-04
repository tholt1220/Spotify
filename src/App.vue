<template>
<div id ="app" class ="container-fluid text-center">
  <div class="jumbotron">
      <h1>The Spotify Distance</h1>      
      <p>There are over 25 million different artists on Spotify, and on average each artist colaborates with 3.51 other artists. So how many collaborations would it get from Snoop Dogg to Celine Dion?</p>
      <p>Find two artists' <strong>SPOTIFY DISTANCE</strong>, AKA the degrees of separation between them. </p>
  </div>     
  <div v-if="isSearching">
      <Search @toggle-search="toggleSearch" @results="getResults" />
  </div>
  <div v-else>
      <Result @toggle-search="toggleSearch" v-bind:results="this.results" />
  </div>
  <footer class="footer">
      <div class="container-fluid">
        <div class="row">
          <div class="col-12">
            <p class="m-0 text-center text-white">Copyright © Trevor Holt 2021 | Inspired by <a class="text-white" href='http://sixdegreesofkanyewest.com/'>Six Degrees of Kanye West</a></p>
          </div>
        </div>
      </div>
    </footer>
</div>
</template>

<script>
import Search from './components/search.vue'
import Result from './components/result.vue'


export default {
  name: 'App',
  components: {
    Search,
    Result
  },
  data(){
    return{
      isSearching: true,
      results: []
    }
  },
  methods: {
    toggleSearch(b){
      this.isSearching = b
    },

    getResults(res){
      this.results = res
    }
  }
}
</script>

<style>
#app {
  font-family: 'Courier New', Courier, monospace;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  background-color:#a8dadc
}

html{
    background-color:#a8dadc
}

search {
  margin-top: 60px
}

.footer {
  text-align:center;
  position: fixed;
  bottom:0;
}
</style>
