/** Function that receives a sheet from a Google Spreadsheet and adjust its size to
 * meet the needed bounds
 * 
 * @param {Sheet} sheet - the sheet which size will be adjusted
 * @param {number} csv_rows - the number of rows to which the sheet will adjust
 * @param {number} csv_columns - the number of columns to which the sheet will adjust
 */
function adjustSheetSize(sheet, csv_rows, csv_columns){
  // current amount of rows in the sheet
  var sheet_rows = sheet.getMaxRows();
  
  // current amount of columns in the sheet
  var sheet_columns = sheet.getMaxColumns();

  // if there is more columns than needed
  if(csv_columns < sheet_columns){

    sheet.deleteColumns(1, sheet_columns - csv_columns);

  };

  // if there is more rows than needed
  if(csv_rows < sheet_rows){

    sheet.deleteRows(1, sheet_rows - csv_rows);

  };

  // if there is less columns than needed
  if(csv_columns > sheet_columns){

    sheet.insertColumns(1, csv_columns - sheet_columns);

  };

  // if there is less rows than needed
  if(csv_rows > sheet_rows){

    sheet.insertRows(1, csv_rows - sheet_rows);

  };

}
