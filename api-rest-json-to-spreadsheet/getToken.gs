/** Function fetches a token from an api rest
 * 
 * @param {string} token_url - the url from where the token will be requested
 * @param {object} token_payload - an object that constains the needed auth. info to fetch a token
 * @returns {string} a valid token to authenticate an api request
 */
function getToken(token_url, token_payload) {
  // parameters for token fetch
  var params = {
    method : 'POST',
    contentType : 'application/x-www-form-urlencoded',
    payload : token_payload
  }

  // token fetch request
  var token_response = UrlFetchApp.fetch(token_url, params)

  // the parsed token is returned
  return JSON.parse(token_response.getContentText())['token']
}
