
const bus = riot.observable();

let token = getToken();

console.log('token = ',token);

// if no token found then let's go to Contentful to get one
if (token === null) {
  window.location.assign('https://be.contentful.com/oauth/authorize?response_type=token&client_id=' + CONFIG.client_id + '&redirect_uri=' + CONFIG.redirect_url + '&scope=content_management_manage');
} else {

  // create Contentful client
  var client = window.contentfulManagement.createClient({
    accessToken: token
  });

  // mount the app
  riot.mount('app');

}

function getToken(){

  // if we have a token in the CONFIG then return it
  if (CONFIG.token) return CONFIG.token;

  // if we have a token in storage then return it
  if (sessionStorage.getItem('token') !== null) return sessionStorage.getItem('token');

  // Check to see if this is a redirect (#access_token={token}&token_type=bearer in URL)

  const regex = /access_token=(\w+)/gm;

  let matches = regex.exec(window.location.hash);

  if (matches === null) return null;

  if (matches.length==2){
    sessionStorage.setItem('token', matches[1]);
    console.log('Got token',matches[1]);
    window.location.replace('index.html');
  } else {
    console.log('Something went wrong trying to extract token',window.location.hash);
  }

}


bus.on('set_publish_date',function(data){

  console.log('data',data);

  client.getSpace(CONFIG.space_id)
    .then(function(space){
      return space.getEnvironment(CONFIG.environment_id);
    })
    .then(function(environment){
      return environment.getEntry(data.id);
    })
    .then(function(entry){
      let publish_date = {'en': data.publish_date}
      entry.fields.publishedDate = publish_date;
      return entry.update();
    })
    .then(function(entry){
      console.log('Entry ' + entry.sys.id + ' updated ' + JSON.stringify(entry.fields));
    })
    .then((entry) => {
      // reload
      bus.trigger('load_pipeline');
      bus.trigger('load_calendar');
    })
    .catch(console.error);

});

bus.on('load_pipeline', function(contentType){

  let queryString = '';
  if(contentType) {
    queryString = `?content_type=${contentType}`;
  }

  // make a raw request to get the pipeline entries - no publishDate, no publishedAt
  client.rawRequest({
    method: 'GET',
    url : CONFIG.space_id + '/environments/' + CONFIG.environment_id + '/entries/' + queryString
  })
  .then(function(data){
    bus.trigger('pipeline_loaded', data.items);
  })
  .catch(console.error);

});

bus.on('load_contenttypes', function() {
  client.rawRequest({
    method: 'GET',
    url: CONFIG.space_id + '/environments/' + CONFIG.environment_id + '/content_types/'
  })
  .then((data) => {
    bus.trigger('contenttypes_loaded', data.items);
  })
});

bus.on('load_calendar', function(start_date, contentType){

    let queryString = '';
    if(contentType) {
      queryString = `?content_type=${contentType}`;
    }

  // make a raw request to get all entries with publishDate ge than start
  client.rawRequest({
    method: 'GET',
    url : CONFIG.space_id + '/environments/' + CONFIG.environment_id + '/entries/' + queryString
  })
  .then(function(data){
    bus.trigger('calendar_loaded', data.items);
  })
  .catch(console.error);
});
