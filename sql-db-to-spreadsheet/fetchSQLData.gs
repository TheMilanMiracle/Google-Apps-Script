// Parameters for the DB connection
var db_user = 'USER';
var db_passwd = 'PASSWORD';

var hostname = 'HOSTNAME';
var connection_port = 'PORT'; 
var database_schema = 'SCHEMA';
var db_url = 'jdbc:mysql://' + hostname + ':' + connection_port + '/' + database_schema; // change accordingly

// Parameters for the data retrieving (query)
var db_table = 'TABLE-NAME';
var query = 'SELECT * FROM ' + db_table + ' LIMIT ? OFFSET ?';

// Google Spreadsheet configurations
// // the name of the sheet that will contain the information imported
var dataSheet_name = '';
// // the name of the sheet that will contain some configurations or information
var configSheet_name = '';
// // format that the spreadsheet will use for dates, numeric values, etc
var spreadSheet_format = 'es_CL';

// Other options
// // the delimiter that will be used to arrange the information in a csv-like format
var delimiter = ';'; // default is ";"
// // amount of rows that will be retrieved per query
var query_size = 10000; // default is 10000
// // the mount of times the program will try to fetch the data from the file
var fetching_retries = 5; // default is 5
// // the amound of SECONDS between fetching tries
var retry_sleep_time = 5; // default is 5

/** Function that fetches the data from a data base and import it into a Google spreadsheet
 * 
 * 
 * this function fetches data from a table from a database, parse the data from query it
 * and using the Sheet API Service import the data into a pre-configured spreadsheet.
 */
function fetchSQLData() {
  // Google Spreadsheet 
  var spreadSheet = SpreadsheetApp.getActiveSpreadsheet()
  var dataSheet = spreadSheet.getSheetByName(dataSheet_name)
  var configSheet = spreadSheet.getSheetByName(configSheet_name);


  // counter for the retries of the fetch process
  var retries_left = fetching_retries;

  while(true){

    try{ // try to fetch the data

      // parameters for the db connection
      var params = {
        user : db_user,
        password : db_passwd
      }

      // the conection with the db is established
      var db_connection = Jdbc.getConnection(db_url, params);

      // an statement is created
      var statement = db_connection.createStatement();

      // a count * query is executed to have the number of rows of the table
      var count_response = statement.executeQuery(query.replace('*', 'COUNT(*)').split('LIMIT')[0]);

      // the total amount of rows is retrieved from the query
      count_response.next()
      var total_rows = count_response.getInt(1);
      count_response.close()
      statement.close()

      // the columns names are retrieved first
      statement = db_connection.prepareStatement(query);
      statement.setInt(1, 1);
      statement.setInt(2, 1);
      columns_response = statement.execute();

      var columns = '';

      // the needed data from the statement is retrieved
      var stmt_metadata = statement.getResultSet().getMetaData()
      var total_columns = stmt_metadata.getColumnCount()

      // for every column
      for(j = 1; j <= total_columns; j++){
        columns += stmt_metadata.getColumnName(j) + delimiter;
      }

      statement.close()

      // the data array will contain every row that will be exported
      var data = [columns.substring(0, columns.length - 1)];

      // amount of blocks of rows that will be queried
      var blocks = Math.ceil(total_rows / query_size);

      // for every block of rows
      for(i = 0; i <= blocks; i++){
        
        // the block statement is created and parameterized
        statement = db_connection.prepareStatement(query);
        statement.setInt(1, query_size);
        statement.setInt(2, Math.min(i * query_size, total_rows));

        // the query is executed
        statement.execute();

        // the result set is retrieved from the statement
        var block_resultSet = statement.getResultSet();

        // while there is still rows to process
        while(block_resultSet.next()){

          columns = '';

          // for every columns in the row
          for(j = 1; j <= total_columns; j++){

            // the value of the row is added to the row string
            columns += block_resultSet.getString(j) + delimiter;

          }

          // the column is added to the acumulated data array
          data.push(columns.substring(0, columns.length - 1));

        }

        statement.close();

      }

      // the date of the fetching is stored for aditional information 
      var fetch_date = new Date();

      break;
    }
    catch(error){// if there is an error while importing the data

      Logger.log(error)

      if(retries_left > 0){ // if there is still retries left

        // the retries counter is updated
        retries_left--;

        // the programs wait an specified number of seconds before making another try
        Utilities.sleep(retry_sleep_time * 1000);
        
      }
      else{ // if after the specified number of retries the process was unsuccessful and a report is sent

        // the report email extracted from the spreadsheet
        var report_email = configSheet.getRange('B2').getValue();


        if(report_email){// if the report email is defined in the spreadsheet

          // the email content can be customized with the next variables
          // remember that the last thrown exception is stored in the variable 'error' in this scope
          var subject = '';
          var body = '';

          // the email is sent reporting the error
          GmailApp.sendEmail(report_email, subject, body);   

        }

        return;

      }

    }
    finally{// to make sure the connection is closed
      if(db_connection){

        db_connection.close();

      }
    }
  }


  // adjusting the size of the sheet for the information to fit in it
  adjustSheetSize(dataSheet, data.length, data[0].split(delimiter).length)

  // sheet and spreadsheet id for the api calls
  var sheetId = dataSheet.getSheetId();
  var spreadSheet_id = spreadSheet.getId();


  try{ //try to import the data (only 1 try to avoid time limit)

    /*
    this mode sends the data to the api along with the csv delimiter for the api itself to process 
    the data into rows
    */
    // the total amount of rows that will be imported to the csv
    var lines_amount = data.length;

    // the amount of lines per api call
    var chunk_lines = 35000;

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
    var report_email = configSheet.getRange('B2').getValue();


    if(report_email){// if the report email is defined in the spreadsheet

      // the email content can be customized with the next variables
      // remember that the last thrown exception is stored in the variable 'error' in this scope
      var subject = '';
      var body = '';

      // the email is sent reporting the error
      GmailApp.sendEmail(report_email, subject, body);   

    }

    return;

  }

  // finally the stored date for the data fetch process is stored in the sheet
  configSheet.getRange('B1').setValue(fetch_date);
  
}
