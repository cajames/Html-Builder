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
        var splitHierarchy = function(abbString, origObjects) {

            var objects;

            if (origObjects) {
                objects = origObjects;
            } else {
                objects = [];
            }

            // check for first split.
            var matches = abbString.match(/(^[^>\+]+)([>\+])?/);

            // Create the object and push it onto the list.
            var object = createObject(matches[1]);
            objects.push(object);

            if (matches[2] == '>') { // child
                // change the string
                abbString = abbString.slice(matches[0].length);

                // set child
                object.children = splitHierarchy(abbString);

            } else if (matches[2] == '+') { // sibling

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


        var buildHtmlTree = function(abbString) {

            html = '';

            objects = splitHierarchy(abbString);

            for(var key in objects) {
                html += createHtml(objects[key]);
            }

            return html;

        };


        var createObject = function(createString) {

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
            buildHtmlTree: buildHtmlTree
        };

    }();

})(window);
