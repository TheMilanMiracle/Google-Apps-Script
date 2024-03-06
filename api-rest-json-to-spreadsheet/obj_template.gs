/** The structure of this template will define how the data will be extracted from the
 * fetched JSON array
 * 
 * When the JSON comes with nested objects, you can define the route of a value with the
 * use of '.' to mark the nesting in the keys of the templante. And the values will be the displayed
 * names in the spreadsheet table. (not found values are filled with and empty space)
 * 
 * @example:
 * // with this json response:
 * // [{'age' : 18, 'hobby' : {'id' : 1, 'name': 'music'} },
 * // {'age' : 23, 'hobby' : {'id' : 2, 'name' : 'cooking'} }]
 * 
 * // and this template
 * const obj_template = {
 *  'age' : 'Age',
 *  'hobby.name' : 'Hobby',
 *  'hobby.id ' : 'Hobby ID'
 * }
 * 
 * // the spreadsheet will look like this:
 * | Age | Hobby   | Hobby ID |
 * | 18  | music   | 1        |
 * | 23  | cooking | 2        |
 *
 */
 
const obj_template = {}