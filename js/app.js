
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
      let publish_date = {'en-US': data.publish_date}
      entry.fields.publishDate = publish_date;
      return entry.update();
    })
    .then(function(entry){
      console.log('Entry ' + entry.sys.id + ' updated ' + JSON.stringify(entry.fields));
    })
    .catch(console.error);

});

bus.on('load_pipeline', function(){

  // make a raw request to get the pipeline entries - no publishDate, no publishedAt
  client.rawRequest({
    method: 'GET',
    url : CONFIG.space_id + '/entries/?&content_type=' + CONFIG.content_type + '&sys.publishedAt[exists]=false&fields.publishDate[exists]=false&order=fields.title'
  })
  .then(function(data){
    bus.trigger('pipeline_loaded', data.items);
  })
  .catch(console.error);

});

bus.on('load_calendar', function(start_date){

  // make a raw request to get all entries with publishDate ge than start
  client.rawRequest({
    method: 'GET',
    url : CONFIG.space_id + '/entries/?&content_type=' + CONFIG.content_type + '&fields.publishDate[gte]=' + start_date.toISOString() + '&order=-fields.publishDate'
  })
  .then(function(data){
    bus.trigger('calendar_loaded', data.items);
  })
  .catch(console.error);
});
