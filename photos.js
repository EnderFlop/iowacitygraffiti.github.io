window.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('.folderContainer');
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  const folder = urlParams.get("folder");
  const location = urlParams.get("location")

  let artistListResetState;
  const flairCount = 15; //CHANGE ON NEW FLAIR. ALSO CHANGE IN INDEX.JS!

  main()
  const resetButton = document.getElementById("reset-button")
  resetButton.onclick = function(){
    container.innerHTML = ""
    artistListResetState.forEach(node => {
      container.appendChild(node)
    })
  }

  let forward = true
  let lastCall;
  rotateTwitchers()
  function rotateTwitchers(){
    const twitchers = document.querySelectorAll(".twitching")
    twitchers.forEach(div => {
      rotationAmount = (forward ? "5deg" : "-5deg")
      div.style.transform = `rotate(${rotationAmount})`
    })
    clearTimeout(lastCall)
    lastCall = setTimeout(rotateTwitchers, 500)
    forward = !forward
  }
  
  async function main(){
    loadCoordData()
    let tag_locations = {}
    await loadImagesFromFolder(tag_locations)
    await new Promise(r => setTimeout(r, 1000));
    putDataOnMap(tag_locations)
    if (location) {
      reorderPhotos(location)
    }
  }

  function loadCoordData(){
    console.log("loading coord data")
    fetch('https://raw.githubusercontent.com/EnderFlop/iowacitygraffiti-archive/master/location_coords.json')
    .then(response => response.json())
    .then(data => {
      location_coords = data
    })
  }

  function loadImagesFromFolder(tag_locations){
    console.log('loading images')
    //first, load all the images
    container.innerHTML = ''; // Clear the image container before loading new images
    return fetch(`https://raw.githubusercontent.com/EnderFlop/iowacitygraffiti-archive/master/artist_meta.json`)
      .then(response => response.json())
      .then(async data => {
        artist_data = data[folder]

        const { Map } = await google.maps.importLibrary("maps");
        map = new Map(document.querySelector("#map"), {
          mapTypeId: "satellite",
          center: {lat: 41.66011976254432, lng:-91.53466100556186},
          zoom: 15,
          mapId: "MAP_ID"
        })

        const titleBarText = document.querySelector(".title-bar-text")
        const artistName = artist_data["name"]
        titleBarText.innerHTML = `ARTIST: ${artistName}`

        const photos = artist_data["photos"]

        if (artist_data["favorite"] == true) {
          loadFavoriteHeader()
        }

        let flairIndex = 0;
        Object.values(photos).forEach(photoList => {
          photoList.forEach(photo => {
            const window = document.createElement('div');
            window.classList.add("window");

            const titleBar = document.createElement("div");
            titleBar.classList.add("title-bar")

            const titleBarText = document.createElement('div');
            titleBarText.classList.add("title-bar-text")

            titleBar.appendChild(titleBarText)
            window.appendChild(titleBar)

            const windowBody = document.createElement('div');
            windowBody.classList.add("window-body")

            const linkElement = document.createElement("a")
            linkElement.href = `piece.html?artist=${artistName}&imgName=${photo}`

            const flair = document.createElement('img');
            flair.classList.add("flair")
            flair.classList.add("twitching")
            flair.src = `./media/flairs/flair${flairIndex}.png`

            const imageElement = document.createElement('img')
            imageElement.classList.add("preview-image")
            imageElement.src = `https://raw.githubusercontent.com/EnderFlop/iowacitygraffiti-archive/master/photos/${artistName}/${photo}_thumbnail.jpeg`

            linkElement.appendChild(imageElement)
            linkElement.appendChild(flair)
            windowBody.appendChild(linkElement)
            window.append(windowBody)

            //then, load the metadata
            //horribly inefficient, will likely add data to artist_meta eventually. have to reduce json size first.
            
            fetch(`https://raw.githubusercontent.com/EnderFlop/iowacitygraffiti-archive/master/photos/${artist_data['name']}/${photo}.json`)
            .then(response => response.json())
            .then(data => {
              loc = data["location"]
              titleBarText.innerHTML = `${loc}`
              if (loc in tag_locations){
                tag_locations[loc] += 1
              }
              else {          
                tag_locations[loc] = 1
              }
            })
            container.append(window)

            flairIndex += 1;
            if (flairIndex == flairCount) {flairIndex = 0}
          })
        })
        artistListResetState = document.querySelectorAll(".folderContainer .window")
        
      })
      .catch(error => {
        console.log('Error:', error);
      });
  }

  async function putDataOnMap(tag_locations) {
    console.log('putting data on map')

    const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker");

    Object.entries(tag_locations).forEach(item => {
      const location = item[0]
      const count = item[1]

      const content = new PinElement({"glyph": `${count}`})

      const coords = location_coords[location]["lat_long"]
      myLat = parseFloat(coords.split(", ")[0])
      myLon = parseFloat(coords.split(", ")[1])
      position = {lat: myLat, lng: myLon}
      const marker = new AdvancedMarkerElement({
        map: map,
        position: position,
        content: content.element,
        title: location
      });
      marker.addListener("click", ({domEvent, latLng}) => {
        console.log(location_coords)
        coordString = `${latLng.lat()}, ${latLng.lng()}`
        currentLocation = Object.keys(location_coords).find(key => location_coords[key]["lat_long"] == coordString)
        reorderPhotos(currentLocation)
      })
    })
  }

  function loadFavoriteHeader() {
    console.log("favorite artist! loading header")

    const windowBody = document.getElementById("favorite-window-body");

    const favArt = document.createElement('img');
    favArt.id = "fav-art"
    favArt.src = `./media/favorite_flair.png`

    const artistImage = document.createElement("img");
    artistImage.id = "splash"
    artistImage.src = `https://raw.githubusercontent.com/EnderFlop/iowacitygraffiti-archive/master/photos/${folder}/${folder}.png`;

    windowBody.appendChild(favArt)
    windowBody.appendChild(artistImage)

    fetch(`https://raw.githubusercontent.com/EnderFlop/iowacitygraffiti-archive/master/favorites.json`)
    .then(res => res.json())
    .then(data => {
      artistData = data[folder]
      console.log(artistData)
      //description
      const text = document.createElement("p")
      text.innerHTML = artistData["description"]
      windowBody.appendChild(text)
      //tags with
      if (artistData["tags_with"]){
        const text = document.createElement("p")
        text.innerHTML = "TAGS WITH: " + artistData["tags_with"]
        windowBody.appendChild(text)
      }
      //groups
      if (artistData["groups"]){
        const text = document.createElement("p")
        text.innerHTML = "GROUPS: " + artistData["groups"]
        windowBody.appendChild(text)
      }
    })

    const window = document.getElementById("favorite-window")
    window.style.display = "block"
  }

  function reorderPhotos(location) {
    console.log("reordering photos")
    console.log(location)
    const allChildren = document.querySelectorAll(".folderContainer .window")
    container.innerHTML = ""
    const sortYes = []
    const sortNo = []
    allChildren.forEach(child => {
      const tempLoc = child.querySelector(".title-bar-text").innerText
      if (tempLoc == location) {
        sortYes.push(child)
        child.querySelector("img").style.border = "5px solid #000080"
      }
      else {
        sortNo.push(child)
        child.querySelector("img").style.border = ""
      }
    })
    const together = sortYes.concat(sortNo)
    together.forEach(child => {
      container.appendChild(child)
    })
  }
})