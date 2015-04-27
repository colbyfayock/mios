var mios = {

    icons: false,

    getIcons: function() {
        
        return this.icons;

    },

    sizes: false,

    getSizes: function( type ) {

        return this.sizes[type];

    },

    sortSizes: function( sizes ) {

        var sizesObj = [];

        for ( var i = 0; i < sizes.length; i++ ) {

            for ( var j = 0; j < sizes[i].length; j++ ) {
                sizesObj.push( sizes[i][j] );
            }

        }

        sizesObj.sort(function(a, b) {
            return b[1] - a[1];
        });

        return sizesObj;

    },

    docValidate: function( doc, name ) {

        var appWidth = doc.width,
            appHeight = doc.height;


        if ( appWidth !== appHeight ) {
            if ( !this.errors ) this.errors = [];
            this.errors.push( name + ' - not square\r');
            return false;
        }

        if ( appWidth < 512 ) {
            if ( !this.errors ) this.errors = [];
            this.errors.push( name + ' - smaller than 512px\r');
            return false;
        }

        return true;

    },

    compress: function() {

        

    },

    save: function( file ) {

        var opts = new PNGSaveOptions();

        opts.interlaced = true;

        if ( activeDocument.mode == DocumentMode.INDEXEDCOLOR ) {
            activeDocument.changeMode( ChangeMode.RGB );
        }

        var tinypng = new ActionDescriptor();
        tinypng.putPath(charIDToTypeID("In  "), file); /* Overwrite original! */

        var compress = new ActionDescriptor();
        compress.putObject(charIDToTypeID("Usng"), charIDToTypeID("tinY"), tinypng);
        executeAction(charIDToTypeID("Expr"), compress, DialogModes.NO);

        // activeDocument.saveAs( file, opts );

    },

    build: function() {        
            
        var dirIcons = new Folder( (new File($.fileName)).parent + "/assets/icons/" ),
            iconList = this.getIcons();

        for ( var i = 0, iconsLen = iconList.length; i < iconsLen; i++ ) {

            var iconSizes = [],
                iconObj = iconList[i],
                iconDir,
                iconDoc,
                bundleFolder,
                iconFolder;

            if ( !iconObj.psd_id ) continue;

            if ( iconDir = dirIcons.getFiles(iconObj.psd_id + '.psd')[0] ) {
                iconDoc = open( iconDir );
                iconDoc.flatten();
            } else {
                if ( !this.errors ) this.errors = [];
                this.errors.push( iconObj.name + ' - PSD does not exist\r');
                continue;
            }

            if ( !this.docValidate( iconDoc, iconObj.name ) ) {
                iconDoc.close( SaveOptions.DONOTSAVECHANGES );   
                continue;
            }

            if ( iconObj.icons ) {

                iconFolder = iconObj.icons.folder && iconObj.icons.folder !== '' ? iconObj.icons.folder : false;

                bundleFolder = new Folder( (new File($.fileName)).parent + "/dist/mios/Bundles/" + iconObj.bundle_id + ( iconFolder ? iconFolder : '' ) );
                if ( !bundleFolder.exists ) bundleFolder.create();

                if ( iconObj.icons.appicon ) iconSizes.push( this.getSizes('appicon') );
                if ( iconObj.icons.icon ) iconSizes.push( this.getSizes('icon') );
                if ( iconObj.icons.custom ) iconSizes.push( iconObj.icons.custom );

                iconSizes = this.sortSizes( iconSizes );

            }

            if ( iconSizes && iconSizes.length > 0 ) {

                for ( var j = 0, iconSizesLen = iconSizes.length; j < iconSizesLen; j++ ) {

                    var iconFile,
                        iconFilePath = '';

                    iconFilePath += "/" + iconSizes[j][0] + ( iconSizes[j][2] && iconSizes[j][2] !== '' ? '' : ".png" );
                    app.activeDocument.resizeImage( iconSizes[j][1], iconSizes[j][1], undefined, ResampleMethod.BICUBICSHARPER);
                    iconFile = new File( decodeURI(bundleFolder) + iconFilePath );

                    this.save( iconFile );

                }

            }            

            iconDoc.close( SaveOptions.DONOTSAVECHANGES ); 
            

        }

    },

    errors: false,

    parseErrors: function( errors ) {

        var errorLen = this.errors.length,
            errorMsg = 'Errors:\r';

        if ( errorLen < 1 ) return false;

        for ( var b = 0; b < errorLen; b++ ) {
            errorMsg += this.errors[b];
        }

        return errorMsg;

    },

    getErrors: function() {

        return this.parseErrors( this.errors );

    }

};;mios.icons = [];


mios.icons.push({
    name: 'Apple SMS',
    bundle_id: 'com.apple.MobileSMS',
    app_id: 'MobileSMS.app',
    psd_id: 'apple_sms',
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Apple SMS Alt',
    bundle_id: 'com.apple.MobileSMS',
    app_id: 'MobileSMS.app',
    psd_id: 'apple_sms_alt',
    icons: {
        folder: '/alt',
        appicon: true
    }
});
;mios.sizes = {

    appicon: [

        [ 'AppIcon29x29',          29 ],
        [ 'AppIcon29x29~ipad',     29 ],
        [ 'AppIcon29x29@2x',       58 ],
        [ 'AppIcon29x29@2x~ipad',  58 ],
        [ 'AppIcon29x29@3x',       87 ],
        [ 'AppIcon29x29@3x~ipad',  87 ],

        [ 'AppIcon40x40',          40 ],
        [ 'AppIcon40x40~ipad',     40 ],
        [ 'AppIcon40x40@2x',       80 ],
        [ 'AppIcon40x40@2x~ipad',  80 ],
        [ 'AppIcon40x40@3x',       120 ],
        [ 'AppIcon40x40@3x~ipad',  120 ],

        [ 'AppIcon50x50',          50 ],
        [ 'AppIcon50x50@2x',       100 ],

        [ 'AppIcon57x57',          57 ],
        [ 'AppIcon57x57@2x',       114 ],

        [ 'AppIcon60x60',          60 ],
        [ 'AppIcon60x60@2x',       120 ],
        [ 'AppIcon60x60@3x',       180 ],

        [ 'AppIcon72x72',          72 ],
        [ 'AppIcon72x72~ipad',     72 ],
        [ 'AppIcon72x72@2x',       144 ],
        [ 'AppIcon72x72@2x~ipad',  144 ],

        [ 'AppIcon76x76',          76 ],
        [ 'AppIcon76x76~ipad',     76 ],
        [ 'AppIcon76x76@2x',       152 ],
        [ 'AppIcon76x76@2x~ipad',  152 ],

        [ 'AppIcon120x120',        120 ]

    ],

    icon: [

        [ 'Icon',              60 ],
        [ 'Icon@2x',           120 ],
        [ 'Icon@3x',           180 ],

        [ 'Icon-40',           40 ],
        [ 'Icon-40@2x',        80 ],
        [ 'Icon-40@3x',        180 ],

        [ 'Icon-60',           60 ],
        [ 'Icon-60@2x',        120 ],
        [ 'Icon-60@3x',        180 ],

        [ 'Icon-72',           72 ],
        [ 'Icon-72@2x',        144 ],

        [ 'Icon-76',           76 ],
        [ 'Icon-76@2x',        152 ],

        [ 'Icon-Small-40',     40 ],
        [ 'Icon-Small-40@2x',  80 ],
        [ 'Icon-Small-40@3x',  120 ],

        [ 'Icon-Small-50',     50 ],
        [ 'Icon-Small-50@2x',  100 ],
        [ 'Icon-Small-50@3x',  150 ],

        [ 'Icon-Small',        29 ],
        [ 'Icon-Small@2x',     58 ],
        [ 'Icon-Small@3x',     87 ]

    ]

};;// try {
	mios.build();
	if ( errors = mios.getErrors() ) alert( errors );
// } catch (e) {
// 	alert( 'Program error' );
// }