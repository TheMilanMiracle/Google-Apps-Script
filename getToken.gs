/** Function that receives the credentials for a registered app and fetches
 * a token for microsft service authentication
 * 
 * @param {string} clientId - the client id of the registered app
 * @param {string} clientSecret - a secret generated for the registeres app
 * @param {string} tenantId - the tenant id of the registered app
 * @returns {string} a valid token to authenticate a microsoft service request
 */
function getToken(clientId, clientSecret, tenantId) {

  // payload for the request
  var payload = {
    'grant_type' : 'client_credentials',
    'client_id' : client_id,
    'client_secret' : client_secret,
    'scope' : 'https://graph.microsoft.com/.default'
  };

  // params for the fetch request
  var params = {
    'method' : 'get',
    'contentType' : 'application/x-www-form-urlencoded',
    'payload' : payload
  };

  // getting the token
  var token_url = `https://login.microsoftonline.com/${tenant_id}/oauth2/v2.0/token`;

  // making the request
  var response = UrlFetchApp.fetch(token_url, params);

  //parsing the token
  var token = JSON.parse(response.getContentText())['access_token'];

  // the token is returned
  return token;
  
}
