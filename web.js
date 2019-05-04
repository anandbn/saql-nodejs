require('dotenv').config();
var express = require('express'),
    oauth2 = require('salesforce-oauth2'),
    session = require('express-session'),
    axios = require('axios');

var callbackUrl = process.env.SF_CALLBACK_URL,
    consumerKey = process.env.SF_CLIENT_ID,
    consumerSecret = process.env.SF_CLIENT_SECRET;

var app = express();

// Which port to listen on
app.set('port', process.env.PORT || 3000);


//Middleware
app.use(session({secret: "w585hJqIfL0GWMUbD1WboOuvsjG9Urv1h8cEv8XyFZBPYV582WnLKapj1TboI5gp8sy3hDC53mbDXYDjLrIEvBbsz3MDKmzdLZCw"}));

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
    }, async function (error, payload) {
        console.log('Payload:' + JSON.stringify(payload));
        if (payload) {
            console.log(JSON.stringify(payload,'\n',4))
            let saqlReqBody = {
                "query": "q = load \"0Fb460000008RzyCAE/0Fc460000009TdnCAE\";" +
                         "q = group q by all;q = foreach q generate count() as 'count';" +
                         "q = limit q 2000;"
            }
            
            
            let saqlUrl = payload.instance_url+'/services/data/v45.0/wave/query';
            let saqlResponse = await axios.post(saqlUrl,saqlReqBody,{
                headers: {
                    "Authorization": "OAuth " + payload.access_token
                }
            });
            response.send(saqlResponse.data);
        } else {
            console.log('Empty Payload');
            response.send('Empty payload received. Try again !!!');
        }
    });
};

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
    return response.redirect(uri);
};

app.get('/oauth/callback', oauthCallback);


app.get("/",init );




// Start listening for HTTP requests
var server = app.listen(app.get('port'), function() {
  var host = server.address().address;
  var port = server.address().port;

  console.log('mData listening at http://%s:%s', host, port);
});