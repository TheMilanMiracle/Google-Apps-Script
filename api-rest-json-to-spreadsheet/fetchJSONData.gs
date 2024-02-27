//Authentification parameters
const token_request_url = 'TOKEN-URL'
const token_auth_payload = TOKEN-PAYLOAD

//API REST fetch information
const api_endpoint = 'API-ENDPOINT'
const api_method = 'API-METHOD'

// Google Services urls
const spreadSheet_url = 'SPREADSHEET-URL';

// Other options
// // the mount of times the program will try to fetch the data from the file
const fetching_retries = 5; // default is 5
// // the amound of SECONDS between fetching tries
const retry_sleep_time = 5; // default is 5
// // import mode (false: the data is imported using a delimiter, true: the data is imported as a html table)
const html_import_mode = false; //default is false


/** Function that fetches JSON data from a REST API and imports it into a Google Sheets spreadsheet.
 * 
 * This function does not accept parameters but its behaviour can be configured using 
 * the global variables of the file and with the preconfigured spreadsheet
 */
function fetchJSONData() {
  // Google Spreadsheet 
  var spreadSheet = SpreadsheetApp.openByUrl(spreadSheet_url);
  var dataSheet = spreadSheet.getSheets()[0];
  var configSheet = spreadSheet.getSheets()[1];


  // counter for the retries of the fetch process
  var retries_left = fetching_retries;

  while(true){
    try{ // tries to fetch the datap
      // paramaters for the json fetch request
      var params = {
        method : 'GET',
        contentType : 'application/json',
        headers : {
          Authorization : `Bearer ${getToken(token_request_url, token_auth_payload)}`
        }
      }

      // api fetch request
      var api_response = UrlFetchApp.fetch(`${api_endpoint}${api_method}`, params)


      // if the response code is not 200
      if(api_response.getResponseCode() != 200){

        throw Error(`The data was not correctly fetched | response code ${response.getResponseCode()}`);

      } 

      // the text in the response is parsed into a json
      api_response = JSON.parse(api_response.getContentText('UTF-8'));

      //when the csv file is correctly downloaded the date and time is gotten for extra information
      var feth_date = new Date();

      break;

    }
    catch(error){ // if something goes wrong with the data fetch

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
    first_row += `${obj_template[key]};`;
  
  }

  // the first row is added to the data array
  data.push(first_row.substring(0, first_row.length-1));


  // for every object fetched
  for(var i = 0; i < Object.keys(api_response).length; i++){

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
          
          row_data += `;`; 
          
          continue;
          
        }

        else{// the result value of the object chain is stored in the row

          row_data += `${obj};`;

        }

      }
      // if the wanted value is directly in the first level
      else{

        // the value is added to the row data
        row_data += `${row_json[key]};`
        
      }
    }

    // the new row is added to the rows array
    data.push(row_data.substring(0, row_data.length-1));

  }

  // the sheet size will be adjusted according to the needed space for all the data
  adjustSheetSize(dataSheet, data.length, data[0].split(';').length);

  // sheet and spreadsheet id for the api calls
  const sheetId = dataSheet.getSheetId();
  const spreadSheet_id = spreadSheet.getId();

  try{ //try to import the data (only 1 try to avoid time limit)

    /*
    this mode sends the data to the api along with the csv delimiter for the api itself to process 
    the data into rows, this approach is generally faster (depends on the data density)
    */
    if(!html_import_mode){

      // the amount of lines per api call
      const chunk_lines = 35000;

      // the data is imported in parts into the spreadsheet to avoid slower api requests
      for(i = 0; i < data.length; i+=chunk_lines){

        // the data that will be imported in the current api call
        var chunk = data.slice(i, Math.min(i + chunk_lines, data.length));
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
                delimiter : ';'
              }
            }
          ]
        };

        // call to the sheets api
        Sheets.Spreadsheets.batchUpdate(resource, spreadSheet_id);
        SpreadsheetApp.flush();

      }

    }
    /*
    this mode transforms the rows into a html table and send it to the api for it to precess 
    the data into rows, this approach is generally a bit slower (depends on the data density)
    */
    else{

      // the amount of lines per api call
      const chunk_lines = 25000;

      // the data in a html table for format
      const html_table =  csvTextToHtmlTable(data.slice(i, Math.min(i + chunk_lines, data.length)))

      // the data is imported in parts into the spreadsheet to avoid slower api requests
      for(i = 0; i < data.length; i += chunk_lines){

        // parameters of the api call to import data
        var resource = {
          requests: [
            {
              pasteData : {
                coordinate : {
                  sheetId : sheetId,
                  rowIndex : i,
                  columnIndex : 0
                },
                data : html_table,
                html : true
              }
            }
          ]
        };

        // call to the sheets api
        Sheets.Spreadsheets.batchUpdate(resource, spreadSheet_id);
        SpreadsheetApp.flush();

      }

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

  // finally the stored date for the data fetch process is stored in the sheet
  configSheet.getRange('B1').setValue(feth_date);

}
