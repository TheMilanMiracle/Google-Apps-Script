/** Function that transform an array of rows of data into a 
 * hmtl table with the same structure
 * 
 * @param {string[]} lines_arr - an array that contain the lines with the data
 */
function csvTextToHtmlTable(lines_arr) {

  // the start of the table is marked
  var ret = '<table>';

  // for every line in the array
  for(line = 0; line < lines_arr.length; line++){
    // the start of the row is marked
    ret += '<tr>'

    // the columns are written in html form
    lines_arr[line].split(';').forEach(function(val){ret += `<td>${val}</td>`;})

    // the end of the row is marked
    ret += '</tr>'
  }
  
  // the end of the table is marked
  ret += '</table>';

  // the hmtl table created is returned
  return ret;
  
}
