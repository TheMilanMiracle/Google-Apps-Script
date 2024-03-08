//Authentification parameters
const token_request_url = 'TOKEN-URL'
const token_auth_payload = {}

//API REST fetch information
const api_endpoint = 'API-ENDPOINT'
const api_method = 'API-METHOD'

// Google Spreadsheet configurations
// // the name of the sheet that will contain the information imported
const dataSheet_name = '';
// // the name of the sheet that will contain some configurations or information
const configSheet_name = '';
// // format that the spreadsheet will use for dates, numeric values, etc
const spreadSheet_format = 'es_CL';

// Other options
// // whether or not the program has to use a fixed token
const fix_token = false; // default is false
// // value of the fixed token in case the program is configured to use it
const fixed_token = 'FIXED-TOKEN';
// // the route inside the api json response where the list of registers will be stored (a '.' in the route mark a sublevel in the object)
const data_route = ''; // default is first level
// // whether or not the used api allow pagination
const paginate = false; // default is false
// // amount of pages (if pagination is allowed) in which the program will download the data
const total_pages = 10; // default is 10
// // the delimiter that will be used to arrange the information in a csv-like format
const delimiter = ';'; // default is ";"
// // the mount of times the program will try to fetch the data from the file
const fetching_retries = 5; // default is 5
// // the amound of SECONDS between fetching tries
const retry_sleep_time = 5; // default is 5


/** Function that fetches JSON data from a REST API and imports it into a Google Sheets spreadsheet.
 * 
 * This function does not accept parameters but its behaviour can be configured using 
 * the global variables of the file and with the preconfigured spreadsheet
 */
function fetchJSONData() {
  // Google Spreadsheet 
  var spreadSheet = SpreadsheetApp.getActiveSpreadsheet()
  var dataSheet = spreadSheet.getSheetByName(dataSheet_name)
  var configSheet = spreadSheet.getSheetByName(configSheet_name);


  // counter for the retries of the fetch process
  var retries_left = fetching_retries;

  while(true){

    try{ // tries to fetch the data

      // if there is a fixed token
      if(fixed_token){

        // parameters for the json fetch request
        // // the way in which an api receive the token might vary, make changes accordingly
        var params = {
          method : 'GET',
          contentType : 'application/json',
          muteHttpExceptions : true,
          headers : {
            apikey : fixed_token
          }
        } 

      }
      else{

        // paramaters for the json fetch request
        // // the way in which an api receive the token might vary, make changes accordingly
        var params = {
          method : 'GET',
          contentType : 'application/json',
          headers : {
            Authorization : `Bearer ${getToken(token_request_url, token_auth_payload)}`
          }
        }

      }

      // if the api allow pagination
      if(paginate){ 

        // the number of registers is obtained first

        // // the way of get the total of registers may vary with the api, change it according to your api
        const first_register = JSON.parse(UrlFetchApp.fetch(`${api_endpoint}${api_method}/?page=1&limit=1`, params).getContentText('UTF-8'))
        
        const total_registers = parseInt(first_register['results']['row']['total']);
        // // //

        // the number of registers per request
        const page_registers = Math.ceil(total_registers / total_pages);

        // array to store all the responses
        var pages = [];

        // for every page
        for(i = 1; i <= total_pages; i++){

          // the url is adjusted to fetch the current page

          // // the way to paginate in the request may vary according to a api
          const page_url = `${api_endpoint}${api_method}/?page=${i}&limit=${page_registers}`;
          // // // 

          // the current page is added to the array
          var page_response = UrlFetchApp.fetch(page_url, params);

          // if the code is not 200
          if(page_response.getResponseCode() != 200){

            throw Error(`The data was not correctly fetched | response code ${page_response.getResponseCode()}`);

          } 

          // the content of the page is parsed and pushed into the pages array
          pages.push(JSON.parse(page_response.getContentText('UTF-8')));

        }

        // array that will contain all of the object from the response
        var api_response = [];

        // for every response
        pages.forEach((response) => {
          if(data_route){ // if the list of objects is on a sublevel

            if(data_route.match(/\./)){ // if the list in many sublevels deep

              // the levels described in the template key
              var levels = data_route.split('.');

              // the object in the first level
              var obj = response;

              for(l in levels){ // iterate through the levels to reach the list
                
                // the object is updated with the next level one
                obj = obj[levels[l]];

              }

              // when the list is reached, the objects are pushed into the array with the acumulated objects
              obj.forEach((o) => {api_response.push(o)})

            }
            else{ // if the list in one sublevel deep
              response[data_route].forEach((obj) => {api_response.push(obj)})
            }
          }
          else{ // the list of objects are in the first level
            response.forEach((obj) => {api_response.push(obj)})
          }
        });

      }
      else{ 
        
        // api fetch request
        var api_response = UrlFetchApp.fetch(`${api_endpoint}${api_method}`, params);

        // if the code is not 200
        if(api_response.getResponseCode() != 200){

          throw Error(`The data was not correctly fetched | response code ${response.getResponseCode()}`);

        } 

        // the text in the response is parsed into a json
        api_response = JSON.parse(api_response.getContentText('UTF-8'));

        if(data_route){ // if the list of objects is on a sublevel

          if(data_route.match(/\./)){ // if the list in many sublevels deep

            // the levels described in the template key
            var levels = data_route.split('.');

            // the object in the first level
            var obj = api_response;

            for(l in levels){ // iterate through the levels to reach the list
              
              // the object is updated with the next level one
              obj = obj[levels[l]];

            }

            // when the list is reached a pointer is relocated to store it
            api_response = obj;


          }
          else{ // if the list in one sublevel deep

            api_response = api_response[data_route];

          }
        }

      }

      //when the api data is downloaded the date and time is saved for extra information about the data
      var feth_date = new Date();

      break;

    }
    catch(error){ // if something goes wrong with the data fetch

      // the error is logged into the console
      Logger.log(error)

      if(retries_left > 0){ // if there is still retries left

        // the retries counter is updated
        retries_left--;

        // the programs wait an specified number of seconds before making another try
        Utilities.sleep(retry_sleep_time * 1000);
        
      }

      // if after the specified number of retries the process was unsuccessful and a report is sent
      else{ 

        // the report email extracted from the spreadsheet
        const report_email = configSheet.getRange('B2').getValue();

        // if the report email is defined in the spreadsheet
        if(report_email){

          // the email content can be customized with the next variables
          // remember that the last thrown exception is stored in the variable 'error' in this scope
          const subject = '';
          const body = '';

          // the email is sent reporting the error
          GmailApp.sendEmail(report_email, subject, body);   

        }

        return;

      }
    }
  }


  // the array that will contain the data that will be exported
  var data = [];

  // variable for the first arrow, that contain the columns names
  var first_row = '';

  // the order in the template will define the order in the column names
  for(key in obj_template){

    // the column name is added to the first row
    first_row += `${obj_template[key]}${delimiter}`;
  
  }

  // the first row is added to the data array
  data.push(first_row.substring(0, first_row.length-1));

  // the number of rowe to process
  const response_len = api_response.length;

  // for every object fetched
  for(var i = 0; i < response_len; i++){

    // the current object that will be parsed into a row
    var row_json = api_response[i];

    // the variable that will contain this row data
    var row_data = '';

    // the order in the template will define the order in the column values
    for(key in obj_template){

      //if the wanted value is in a deeper level than the first one
      if (key.match(/\./)){ 

        // the levels described in the template key
        var levels = key.split('.');

        // the object in the first level
        var obj = row_json;

        for(l in levels){

          if(obj == null){break;}
          
          // the object is updated with the next level one
          obj = obj[levels[l]];

        }

        // if the property is not defined in the object an empty columns is added instead
        if(obj == null){
          
          row_data += `${delimiter}`; 
          
          continue;
          
        }

        else{// the result value of the object chain is stored in the row

          row_data += `${obj}${delimiter}`;

        }

      }
      // if the wanted value is directly in the first level
      else{

        // the value is added to the row data
        row_data += `${row_json[key]}${delimiter}`
        
      }
    }

    // the new row is added to the rows array
    data.push(row_data.substring(0, row_data.length-1));

  }

  // the sheet size will be adjusted according to the needed space for all the data
  adjustSheetSize(dataSheet, data.length, data[0].split(delimiter).length);

  // sheet and spreadsheet id for the api calls
  const sheetId = dataSheet.getSheetId();
  const spreadSheet_id = spreadSheet.getId();

  try{ //try to import the data (only 1 try to avoid time limit)

    /*
    this mode sends the data to the api along with the csv delimiter for the api itself to process 
    the data into rows
    */

    // the total amount of rows that will be imported to the csv
    const lines_amount = data.length; 

    // the amount of lines per api call
    const chunk_lines = 35000;

    // the data is imported in parts into the spreadsheet to avoid slower api requests
    for(i = 0; i < lines_amount; i += chunk_lines){

      // the data that will be imported in the current api call
      var chunk = data.slice(i, Math.min(i + chunk_lines, lines_amount));
      var chunkData = chunk.join('\n');

      // parameters of the api call to import data
      var resource = {
        requests : [
          {
            pasteData: {
              coordinate : {
                sheetId : sheetId,
                rowIndex : i,
                columnIndex : 0
              },
              data : chunkData,
              type : 'PASTE_VALUES',
              delimiter : delimiter
            }
          }
        ]
      };

      // call to the sheets api
      Sheets.Spreadsheets.batchUpdate(resource, spreadSheet_id);
      SpreadsheetApp.flush();

    }

    // if the format of the spreadSheet is not correct
    if(Sheets.Spreadsheets.get(spreadSheet_id).properties.locale != spreadSheet_format){

      // an api request to change the spreadsheet format is done
      Sheets.Spreadsheets.batchUpdate({requests : [{ 
        updateSpreadsheetProperties: {
          properties: {
            locale: spreadSheet_format,
          },
          fields: 'locale'
        }
      }]}, spreadSheet_id);

    }

  }
  catch(error){ // if there is an error while importing the data

    Logger.log(error)
        
    // the report email extracted from the spreadsheet
    const report_email = configSheet.getRange('B2').getValue();


    if(report_email){// if the report email is defined in the spreadsheet

      // the email content can be customized with the next variables
      // remember that the last thrown exception is stored in the variable 'error' in this scope
      const subject = '';
      const body = '';

      // the email is sent reporting the error
      GmailApp.sendEmail(report_email, subject, body);   

    }

    return;

  }

  // finally the saved date for the data fetch process is stored in the sheet
  configSheet.getRange('B1').setValue(feth_date);

}