/**
 * Created by Chris J on 1/05/2015.
 *
 * This is an object to help us easily create a DOM structure of our liking, based on an abbreviated string
 *
 * Inspired by Emmet abbreviation expansion.
 * I tried finding a JS implementation of it, but couldn't. So made my own.
 */

(function(window){

    /*
    Cases to handle:
        1. just the tags.
        2. Just the IDs '#xxxx'.
        3. Just the classes. '.xxxx'
        4. A combination of them 'div#xxxx.xxxx' or 'div.xxxx' etc..
        5. '>' within symbol.
        6. [xxxx="xxxxx";xxxx="xxxx"] support for attributes
        7. "*" support for duplicated nodes
            a. "$" support for numbers in duplicated nodes
        8. '+' for next to object

        9. Future Spec: Support (....) for grouping


    Examples to look at:

     #page>div.logo+ul#navigation>li*5>a{Item $}
     #page>(a>li)*3
     ul>(li>a*4>span{test $})*5

     p{testing}>span{another}+{testingmore}+em{another}

     */
    window.HtmlBuilder = function(){

        // Holds the hierarchy. Order matters, outermost first, innermost last
        var levels = [];

        // Break apart the string into a workable nodes hierarchy
        var splitHierarchy = function(abbString, origObjects, currNumber, parentNumber) {

            var objects;

            if (origObjects) {
                objects = origObjects;
            } else {
                objects = [];
            }

            // ----------------------- Parent Multiple Calculation

            // if it's a multiple, recreate the multiple before siblings
            if (currNumber > 1) {

                // subtract one from multiple.
                objects = splitHierarchy(abbString, objects, (currNumber === 1 ? undefined:currNumber-1));

            }


            // ----------------------- Child Calculation


            // Check for brackets here, and update objects.
            var bracketMatch = matchBrackets(abbString, objects);

            // Feed back results from the bracket Matching.
            objects = bracketMatch.objects;
            abbString = bracketMatch.abbString;


            // check for first split. TODO: Check for quotes, or in brackets
            var matches = abbString.match(/(^[^>\+]+)([>\+])?/);

            // if no matches, then return objects here.
            if (!matches) {
                return objects;
            }

            var last = false;
            var newCurrNumber;
            // check for multiples
            if (checkMultiplications(matches[1])) {
                newCurrNumber = checkMultiplications(matches[1]);
                last = true;

            }

            // Strip out the multiplication if any
            var abbrWithoutMultiplication = stripMultiplication(matches[1]);

            // Create the object and push it onto the list. Cases for the numbering provided
            var object;

            if (newCurrNumber) {
                object = createObject(abbrWithoutMultiplication, newCurrNumber);
            } else if (currNumber) {
                object = createObject(abbrWithoutMultiplication, currNumber);
            } else {
                object = createObject(abbrWithoutMultiplication, parentNumber);
            }

            // if it's a multiple, recreate the multiple before siblings
            if (newCurrNumber > 1) {

                // pass down the string without the parent multiplication
                objects = splitHierarchy(abbString.replace(matches[1],abbrWithoutMultiplication), objects, (newCurrNumber === 1 ? undefined:newCurrNumber-1));

            }

            // if there's a child, create it (even for multiples)
            if (matches[2] == '>') {
                // change the string
                abbString = abbString.slice(matches[0].length);

                // set child, passing down current numbering
                if (newCurrNumber) {
                    object.children = splitHierarchy(abbString, undefined, undefined, newCurrNumber);
                } else if (currNumber) {
                    object.children = splitHierarchy(abbString, undefined, undefined, currNumber);
                } else {
                    object.children = splitHierarchy(abbString, undefined, undefined, parentNumber);
                }

            }

            // Push it in.
            objects.push(object);

            // Only match sibling after last multiple.
            if (matches[2] == '+' && (!currNumber || (last && currNumber))) { // sibling

                // change the string. call self with objects
                abbString = abbString.slice(matches[0].length);

                objects = splitHierarchy(abbString, objects);

            }


            return objects;

        };


        // Recursive function to traverse the tree and build the html
        var createHtml = function(object) {

            var html = '';

            // create the tag.
            if (object.tag) {
                html += '<'+object.tag + ' ';
            }

            // Add the ID
            if (object.id) {
                html += 'id=\"'+ object.id +'\" ';
            }

            // Add any classes
            if (object.classes) {
                html += 'class=\"'+ object.classes.join(" ") +'\" ';
            }

            // Add any attributes
            if (object.attributes) {
                html += object.attributes.join(" ");
            }

            // Close off the tag.
            if (object.tag) {
                html += ">";
            }

            // Add the content.
            if (object.content) {
                html += object.content;
            }

            // create the children's html.
            for (var key in object.children) {
                html += createHtml(object.children[key]);
            }

            // add the closing tag
            if (object.tag) {
                html += '</'+ object.tag +'>';
            }


            return html;

        };

        // Used to filter out the context of the brackets
        var matchBrackets = function(abbString, objects) {

            var returnValue;

            // check to see if it matches a bracket
            if (abbString.match(/^\(/)) {

                var position; // undefined to begin with
                var count = 0;
                var inQuote = false;

                // Loop through and match on brackets
                for (var i = 0, len = abbString.length; !position && i < len ; i++) {

                    // Check for open bracket. Increase count.
                    if (abbString[i] == '(' && !inQuote) {
                        count += 1;

                    // Match a matching close bracket. Decrease Count.
                    } else if (abbString[i] ==')' && !inQuote) {
                        count -= 1;

                        // If it reaches back to zero, then set position, and also quit.
                        if (count === 0) {
                            position = i;
                        }

                    // be aware of quotes.
                    } else if (abbString[i].match(/["']/)) {
                        inQuote = !inQuote;
                    }

                }

                // if it found brackets, return the string inside the brackets, and a multiplier.
                if (position) {

                    var bracketText = abbString.substr(1,position - 1);
                    var multiples;

                    //replace the text, and see if there's a following multiplication
                    var remainingString = abbString.replace(abbString.substr(0,position+1), "");

                    var matches = remainingString.match(/^\*(\d+)/);

                    if (matches) {
                        multiples = matches[1];
                    }

                    returnValue = {
                        objects : splitHierarchy(bracketText, objects, multiples),
                        abbString: stripMultiplication(remainingString)
                    };

                    return returnValue;

                }


            }

            returnValue = {
                objects : objects,
                abbString: abbString
            };

            return returnValue;

        };

        var buildHtmlTree = function(abbString) {

            html = '';

            objects = splitHierarchy(abbString);

            for(var key in objects) {
                html += createHtml(objects[key]);
            }

            return html;

        };


        var createObject = function(createString, multiple) {

            if (multiple) {
                //replace any instance of $ with multiple in them
                createString = createString.replace(/\$/g, multiple);
            }

            var object = {
                string: createString,
                tag: getTag(createString),
                classes: getClasses(createString),
                id: getId(createString),
                attributes: getAttributes(createString),
                content: getContent(createString),
                children: []
            };

            return object;

        };


        // Checks for multiplications
        var checkMultiplications = function(createString) {

            var multiples;
            var matches = createString.match(/\*(\d+)$/);

            if (matches) {
                multiples = matches[1]; // the number
            }

            return multiples;

        };

        // Replaces multiplication
        var stripMultiplication = function(createString) {

            var matches = createString.replace(/\*(\d+)$/, '');

            return matches;

        };


        // Gets the attributes. They are split by ';'
        var getAttributes = function(createString) {

            var attributeString, attributes = [];
            var matches = createString.match(/\[(.+)\]/);

            if (matches) {
                attributeString = matches[0];
            }


            if (attributeString) {

                matches = attributeString.match(/[\.\w\_\-]+(=\"[^"]*\")?/g);
                // Split up the attributes
                if (matches) {
                    attributes = matches;
                }

            }

            return attributes;

        };

        // Filters out the classes from the createString
        var getClasses = function(createString){

            var classes;

            // remove all things inside {content} and [attributes]
            createString = createString.replace(/\{[^}]+\}/, '');
            createString = createString.replace(/\[[^}]+\]/, '');

            var matches = createString.match(/\.([\w-_]+)/g);

            if (matches) {

                for (var key in matches) {
                    matches[key] = matches[key].replace(/\./, '');
                }

                classes = matches;

            }

            return classes;

        };

        // Filters out the ID of the element
        var getId = function(createString) {

            var id;

            // remove all things inside {content} and [attributes]
            createString = createString.replace(/\{[^}]+\}/, '');
            createString = createString.replace(/\[[^}]+\]/, '');

            var matches = createString.match(/#([\w-_]+)/);

            if (matches) {
                id = matches[1];
            }

            return id;

        };

        // Gets the tag of the create string if there is one. (Could also be just
        // content)
        var getTag = function(createString) {

            var tag;

            var matches = createString.match(/^[\w_-]+/);
            if (matches) {
                tag = matches[0];
            }

            return tag;

        };


        // Get the content for an object, and return it.
        var getContent = function(createString) {

            var content;

            var matches = createString.match(/\{([^}]+)\}/);

            if (matches) {
                content = matches[1];
            }

            return content;

        };


        // return the exposed functions
        return {
            createObject: createObject,
            buildHtmlTree: buildHtmlTree,
            matchBrackets: matchBrackets
        };

    }();

})(window);
