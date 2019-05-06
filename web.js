require('dotenv').config();
var express = require('express'),
    oauth2 = require('salesforce-oauth2'),
    cookieSession = require('cookie-session'),
    axios = require('axios'),
    bodyParser = require('body-parser');

var callbackUrl = process.env.SF_CALLBACK_URL,
    consumerKey = process.env.SF_CLIENT_ID,
    consumerSecret = process.env.SF_CLIENT_SECRET;

console.log(`SF_CLIENT_ID ${consumerKey} \n SF_CLIENT_SECRET=${consumerSecret} \n CALLBACK_URL=${callbackUrl}`)
var app = express();

// Which port to listen on
app.set('port', process.env.PORT || 3000);


//Middleware
app.use(express.static('public'));
app.use(bodyParser.urlencoded());

app.use(
    cookieSession({
        name: 'session',
        secret: "w585hJqIfL0GWMUbD1WboOuvsjG9Urv1h8cEv8XyFZBPYV582WnLKapj1TboI5gp8sy3hDC53mbDXYDjLrIEvBbsz3MDKmzdLZCw",
        // Cookie Options
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      })
);

oauthCallback = function (request, response) {
    var authorizationCode = request.param('code');
    var loginUrl = request.session.loginUrl;
    oauth2.authenticate({
        redirect_uri: callbackUrl,
        client_id: consumerKey,
        client_secret: consumerSecret,
        code: authorizationCode,
        // You can change loginUrl to connect to sandbox or prerelease env.
        base_url: loginUrl
    }, function (error, payload) {
        //console.log('Payload:' + JSON.stringify(payload));
        if (payload) {
            //console.log(JSON.stringify(payload,'\n',4))
            request.session.access_token=payload.access_token;
            request.session.instance_url=payload.instance_url;
            response.send('Authentication completed !!! use /saql to execute the SAQL');
        } else {
            console.log('Empty Payload');
            response.send('Empty payload received. Try again !!!');
        }
    });
};

runSAQL = async function (request,response){
    let saqlQry  =request.query.q;
    if(!saqlQry){
        response.send('Parameter q is required with the SAQL query to execute');
    }else{
        let saqlReqBody = {
            "query": saqlQry
        }
        /*
        q = load "0Fb460000008RzyCAE/0Fc460000009TdnCAE";q = group q by all;q = foreach q generate count() as 'count';q = limit q 2000;
        
       
       saqlReqBody = {
        "query": "q = load \"0Fb460000008RzyCAE/0Fc460000009TdnCAE\";" +
                 "q = group q by all;q = foreach q generate count() as 'count';" +
                 "q = limit q 2000;"
        }
 */
        let saqlUrl = request.session.instance_url+'/services/data/v45.0/wave/query';
        try{
            let saqlResponse = await axios.post(saqlUrl,saqlReqBody,{
                headers: {
                    "Authorization": "OAuth " + request.session.access_token
                }
            });
            response.send(saqlResponse.data);
        }catch(error){
            response.send(JSON.stringify(error.response.data));
        }
    }

}

runSAQLPost = async function (request,response){
    let saqlQry  =request.body.saqlQuery;
    saqlQry = saqlQry.trim();
    if(!saqlQry){
        response.send('Parameter q is required with the SAQL query to execute');
    }else{
        let saqlReqBody = {
            "query": saqlQry
        }

        let saqlUrl = request.session.instance_url+'/services/data/v45.0/wave/query';
        try{
            let saqlResponse = await axios.post(saqlUrl,saqlReqBody,{
                headers: {
                    "Authorization": "OAuth " + request.session.access_token
                }
            });
            response.send(saqlResponse.data);
        }catch(error){
            response.send(JSON.stringify(error.response.data));
        }
    }

}

init = function (request, response) {
    request.session.loginUrl=request.query.loginUrl;
    var uri = oauth2.getAuthorizationUrl({
        redirect_uri: callbackUrl,
        client_id: consumerKey,
        scope: 'full', // 'id api web refresh_token'
        // You can change loginUrl to connect to sandbox or prerelease env.
        //base_url: 'https://test.salesforce.com'
        base_url: request.query.loginUrl
    });
    console.log(`Redirect URL : ${uri}`)

    return response.redirect(uri);
};

app.get('/oauth/callback', oauthCallback);


app.get("/",init );
app.get("/saql",runSAQL );
app.post('/saql',runSAQLPost);


// Start listening for HTTP requests
var server = app.listen(app.get('port'), function() {
  var host = server.address().address;
  var port = server.address().port;

  console.log('mData listening at http://%s:%s', host, port);
});