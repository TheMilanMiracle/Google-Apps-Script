// Authentication credentials
const client_id = 'CLIENT-ID';
const client_secret = 'CLIENT-SECRET';
const tenant_id = 'TENANT-ID';
const user_id = 'USER-ID';

// Google Services urls
const spreadSheet_url = 'SPREADSHEET-URL';

// Other options
// // the size of the chunks of the data download
const chunks_size = 25000000; //default is 25 MB, limit for fetching is 50 MB
// // the mount of times the program will try to fetch the data from the file
const fetching_retries = 5; // default is 5
// // the amound of SECONDS between fetching tries
const retry_sleep_time = 5; // default is 5
// // import mode (false: the data is imported using a delimiter, true: the data is imported as a html table)
const html_import_mode = false; //default is false


/** Function that fetches the data from a CSV text file and import it to a Google Spreadsheet
 * 
 * 
 * this function fetches a whole csv file hosted in One Drive link by chunks, parse the data in it
 * and using the Sheet API Service import the data into a pre-configured spreadsheet.
 */
function importCSVData() {
  // Google Spreadsheet 
  var spreadSheet = SpreadsheetApp.openByUrl(spreadSheet_url);
  var dataSheet = spreadSheet.getSheets()[0];
  var configSheet = spreadSheet.getSheets()[1];

  // counter for the retries of the fetch process
  var retries_left = fetching_retries;

  while(true){

    try{ // tries to fetch the data

      // parameters of the file metadata request
      var params = {
        'method' : 'GET',
        'contentType' : 'application/json',
        'headers' : {
          'Authorization' : 'Bearer ' + getToken(client_id, client_secret, tenant_id),
        }
      };

      // route of the file extracted from the spreadsheet
      const file_route = configSheet.getRange('B1').getValue();

      // file url constructed with the user id and the route extracted from the spreadsheet
      const file_url = `https://graph.microsoft.com/v1.0/users/${user_id}/drive/items/root:${file_route}:/content`;

      // the url to fetch the metadata of the file
      const metadata_url = file_url.replace(':/content','');

      // metadata fetch response
      response = UrlFetchApp.fetch(metadata_url, params);

      // size of the file (in bytes)
      const file_size = JSON.parse(response.getContentText()).size;

      // the amount of chunks that will be downloaded to get the data in the file
      const file_chunks = Math.ceil(file_size / chunks_size);

      // acumulated data from the file
      var acumulated_data = '';

      // the csv file is downloaded in chunk to make sure the data is gotten correctly
      for(chunk = 0; chunk < file_chunks; chunk++){

        // the chunk range in bytes is defined
        var startByte = chunk * chunks_size;
        var finalByte = Math.min(startByte + chunks_size - 1, file_size - 1);
        var byteRange = "bytes=" + startByte + "-" + finalByte;

        // parameters for the chunk fetch request
        params = {
          'method' : 'GET',
          'headers' : {
            'Authorization' : 'Bearer ' + getToken(client_id, client_secret, tenant_id),
            'Range' : byteRange
          }
        }

        // chunk fetch request
        response = UrlFetchApp.fetch(file_url, params);

        // if the code is not 206 (Partial Content Code)
        if(response.getResponseCode() != 206){

          throw Error(`The data chunk was not correctly fetched | chunk ${chunk+1}/${file_chunks} | response code ${response.getResponseCode()}`);

        } 

        // the current chunk is stored in a variable with the acumulated data
        acumulated_data += response.getContentText('UTF-8');

      }

      //when the csv file is correctly downloaded the date and time is gotten for extra information
      var feth_date = new Date();

      break;

    }
    catch(error){ // if something goes wrong with the file fetching

      if(retries_left > 0){ // if there is still retries left

        // the retries counter is updated
        retries_left--;

        // the programs wait an specified number of seconds before making another try
        Utilities.sleep(retry_sleep_time * 1000);
      }
      else{ // if after the specified number of retries the process was unsuccessful and a report is sent

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

    }

  }

  // the data is splitted in an arrays containing the rows of the csv
  var row_values = acumulated_data.replace(/\r/g,'').split('\n');

  // using a few of the rows to get the delimiter  
  const delimiter = getDelimiter(row_values.slice(0,4));

  // the sheet size is adjusted to the csv file size
  adjustSheetSize(dataSheet, row_values.length, row_values[0].split(delimiter).length);


  // sheet and spreadsheet id for the api calls
  const sheetId = dataSheet.getSheetId();
  const spreadSheet_id = spreadSheet.getId();

  try{ //try to import the data (only 1 try to avoid time limit)

    /*
    this mode sends the data to the api along with the csv delimiter for the api itself to process 
    the data into rows, this approach is generally faster (depends on the data density)
    */
    if(!html_import_mode){

      // the total amount of rows that will be imported to the csv
      const lines_amount = row_values.length;

      // the amount of lines per api call
      const chunks_lines = 35000;

      // the data is imported in parts into the spreadsheet to avoid slower api requests
      for(i = 0; i < lines_amount; i+=chunks_lines){

        // the data that will be imported in the current api call
        var chunk = row_values.slice(i, Math.min(i, i + chunks_lines, lines_amount-1);
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
                delimiter : delimiter
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
      const html_table =  csvTextToHtmlTable(row_values.slice(i, Math.min(i + chunk_lines, row_values.length - 1)))

      // the data is imported in parts into the spreadsheet to avoid slower api requests
      for(i = 0; i < row_values.length; i += chunk_lines){

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
  configSheet.getRange('B3').setValue(feth_date);

}
