#!/usr/bin/env node

var md = require("node-markdown").Markdown,
    cheerio = require("cheerio"),
    ejs = require("ejs"),
    fs = require("fs"),
    path = require("path"),
    argv = require("optimist")
        .usage("Generate documentation with a Markdown file\n" +
               "Usage: $0 FILENAME")
        .demand(1)
        .demand('t')
        .alias('t', 'template')
        .describe('t', 'EJS template to use')
        .default('t', path.dirname(__filename) + "/docs.ejs.html")
        .argv;

var template = ejs.compile(fs.readFileSync(argv.t).toString());

var slugify = function(x) {
    return x
        .replace(/[^\w\s-]/g, '')
        .replace(/[-\s]+/g, '-')
        .trim();
};

argv._.forEach(function(fn) {
    // Render our content.
    var content = fs.readFileSync(fn).toString();

    // Create a Cheerio context to work with.
    var $ = cheerio.load(md(content));

    // Create a ToC structure.
    var toc = {
        children: []
    };

    // Keep a breadcrumb structure of the ToC nodes.
    var tocBreadcrumbs = [toc];

    // Keep track of the slugs we have.
    var slugs = {};

    // The title of the document.
    var title = null;

    // Walk through all the heading elements.
    $("h1, h2, h3, h4, h5, h6").each(function(i, node) {
        var level = parseInt(node.name.substring(1));

        // Pop ToC nodes off the breadcrumbs until we're at the right place.
        while(tocBreadcrumbs.length > level) {
            tocBreadcrumbs.pop();
        }

        // Push ToC nodes onto the breadcrumbs until we're at the right place.
        while(tocBreadcrumbs.length < level) {
            var tocNode = {
                children: []
            };

            tocBreadcrumbs[tocBreadcrumbs.length - 1].children.push(tocNode);
            tocBreadcrumbs.push(tocNode);
        }

        var text = $(node).find(".heading").length ?
            $(node).find(".heading").text() :
            $(node).text();

        if(title === null) {
            title = text;
        }

        var slugBase = slugify(text);
        var slug = slugBase;

        var i = 1;

        while(Object.prototype.hasOwnProperty.call(slugs, slug)) {
            slug = slugBase + '-' + i++;
        }

        // Set the node's ID.
        $(node).attr('id', slug);

        //
        slugs[slug] = true;

        var tocNode = {
            id: slug,
            title: text,
            children: []
        };

        tocBreadcrumbs[tocBreadcrumbs.length - 1].children.push(tocNode);
        tocBreadcrumbs.push(tocNode);
    });

    process.stdout.write(template({
        toc: toc,
        title: title,
        content: $.html()
    }));
});

