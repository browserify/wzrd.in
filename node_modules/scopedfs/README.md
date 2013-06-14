# Scoped FS

A convenient API to build and access file system subtrees (particularly in tests); provides a version of every ‘fs’ module function, scoped to the given root or, optionally, to a new temporary directory; also adds a bunch of convenience methods.

Synopsis 1 — can be used as a drop-in ‘fs’ replacement:

    fs = require 'scopedfs'
    fs.writeFileSync '/tmp/foo.txt', '42'

Synopsis 2 — can be used as a scoped file system:

    sfs = require('scopedfs').scoped('/tmp')
    sfs.writeFileSync 'foo.txt', '42'

Synopsis 3 — can be used to quickly build a temporary folder:

    sfs = require('scopedfs').createTempFS()
    sfs.writeFileSync 'foo.txt', '42'
    sfs.writeFileSync 'bar.txt', '24'

or even shorter:

    sfs = require('scopedfs').createTempFS()
    sfs.applySync {
        'foo.txt': '42'
        'bar.txt': '24'
    }


## Installation

    npm install scopedfs


## API

An instance of ScopedFS is returned by `require('scopedfs')`, and also by `scoped` and `createTempFS` methods. Every instance of ScopedFS defines the following functions:

* All functions from Node.js ‘fs’ module:

        sfs.stat(path, callback)
        sfs.statSync(path)
        sfs.readFile(relpath, encoding, callback)
        sfs.readFileSync(relpath, encoding)
        …etc etc etc…

* Recursive rmdir, courtesy of [rimraf](https://npmjs.org/package/rimraf):

        sfs.rmrf(path, callback)
        sfs.rmrfSync(path, callback)

* Recursive mkdir, courtesy of [mkdirp](https://npmjs.org/package/mkdirp):

        sfs.mkdirp(path, [mode], callback)
        sfs.mkdirpSync(path, [mode])

* A shortcut for `mkdirpSync` and `writeFileSync`:

        sfs.putSync(path, data, [encoding])

* A convenient method for creating or modifying a directory hierarchy, doing a combination of `putSync`, `mkdirpSync` and `rmrfSync` (especially helpful when writing tests):

        sfs.applySync {
          'foo/bar.txt': '42'          # putSync
          'foo/boz.txt': null          # rmrfSync when the value is null
          'foo/boz/':    yes           # mkdirpSync when the key ends with a slash
          'foo/biz':     function(path) { fs.chmodSync(path, 0777); }  # any function accepting a full path
        }

* Creating a scoped fs for the given directory:

        sfs.scoped(subpath)

* Creating a scoped fs for a new temporary directory, courtesy of [temp](https://npmjs.org/package/temp):

        sfs.createTempFS([affixes])

    where `affixes` is either a prefix string (like `"myapp-"`) or an object like `{ prefix: "d-", suffix: ".app" }`.


## License

MIT. © 2012, Andrey Tarantsov.
