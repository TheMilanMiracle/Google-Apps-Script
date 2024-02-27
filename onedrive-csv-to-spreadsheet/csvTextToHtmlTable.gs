/** Function that transform an array of rows of a csv file into a 
 * hmtl table with the same structure
 * 
 * @param {string[]} lines_arr - an array that contain the lines of the csv
 */
function csvTextToHtmlTable(lines_arr) {

  // the start of the table is marked
  var ret = '<table>';

  // for every line in the array
  for(i = 0; i < lines_arr.length; i++){
    // the start of the row is marked
    ret += '<tr>'

    // the columns are written in html form
    lines_arr[i].split(';').forEach(function(val){ret += `<td>${val}</td>`;})

    // the end of the row is marked
    ret += '</tr>'
  }
  
  // the end of the table is marked
  ret += '</table>';

  // the hmtl table created is returned
  return ret;
  
}
