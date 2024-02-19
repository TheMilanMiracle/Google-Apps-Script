/** Function that analyze some amount of rows of a csv text file to get the delimiter
 * that the rows uses and return it
 * 
 * @param {string[]} arr - the array that contains a few first rows of a csv
 * @returns {string} a single character, the delimiter that the given rows use
 */
function getDelimiter(arr){

  // a list of common used delimiters for csv's files
  const potential_delimiters = [',',';','\t','|'];

  // for every delimiter in the list until the delimiter is found
  for(delimiter = 0; delimiter < potential_delimiters.length; delimiter++){

    // the ocurrences of the delimiters in the first row in the array
    const delimiter_ocurrences = (arr[0].match(new RegExp(potential_delimiters[delimiter], 'g'))||[]).length;

    // if there is one or more ocurrences
    if(delimiter_ocurrences >= 1){

      // for the rest of the rows given to the function
      for(idx = 1; idx < arr.length; idx++){

        // if there is a diference in ocurrences in one of these rows the delimiter is discarded
        if((arr[idx].match(new RegExp(potential_delimiters[delimiter], 'g'))||[]).length != delimiter_ocurrences){

          break;

        }

      }

      // if all given rows show the same amount of ocurrences the delimiter has been found
      if(idx == arr.length){
        
        // the found delimiter is returned
        return potential_delimiters[delimiter];

      }

    }

  }

}