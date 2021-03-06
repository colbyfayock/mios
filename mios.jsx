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

    compress: function( file ) {

        if ( activeDocument.mode == DocumentMode.INDEXEDCOLOR ) {
            activeDocument.changeMode( ChangeMode.RGB );
        }

        var tinypng = new ActionDescriptor();
        tinypng.putPath(charIDToTypeID("In  "), file);

        var compress = new ActionDescriptor();
        compress.putObject(charIDToTypeID("Usng"), charIDToTypeID("tinY"), tinypng);
        executeAction(charIDToTypeID("Expr"), compress, DialogModes.NO);

    },

    save: function( file, compress ) {

        if ( !compress ) {

            var opts = new PNGSaveOptions();
            opts.interlaced = true;

            activeDocument.saveAs( file, opts );

        } else {

            var tinypng,
                compressImage;

            if ( activeDocument.mode == DocumentMode.INDEXEDCOLOR ) {
                activeDocument.changeMode( ChangeMode.RGB );
            }

            tinypng = new ActionDescriptor();
            tinypng.putPath(charIDToTypeID("In  "), file);

            compressImage = new ActionDescriptor();
            compressImage.putObject(charIDToTypeID("Usng"), charIDToTypeID("tinY"), tinypng);

            executeAction(charIDToTypeID("Expr"), compressImage, DialogModes.NO);

        }


    },

    build: function( args ) {

        var dirIcons = new Folder( (new File($.fileName)).parent + "/assets/icons/" ),
            iconList = this.getIcons();

        for ( var i = 0, iconsLen = iconList.length; i < iconsLen; i++ ) {

            var iconSizes = [],
                iconObj = iconList[i],
                iconDir,
                iconDoc,
                bundleFolder,
                iconFolder,
                selection;

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

            if ( args.length > 0 && args[0] === 'test' ) {
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

                if ( iconObj.mask && iconObj.mask !== '' ) {

                    iconDoc.artLayers.getByName('Background').isBackgroundLayer = false;

                    this.drawMask( this.getMaskPoints() );
                    selection = app.activeDocument.selection;
                    selection.invert();
                    selection.clear();
                    selection.deselect();

                }

                for ( var j = 0, iconSizesLen = iconSizes.length; j < iconSizesLen; j++ ) {

                    var iconFile,
                        iconFilePath = '';

                    iconFilePath += "/" + iconSizes[j][0] + ( iconSizes[j][2] && iconSizes[j][2] !== '' ? '' : ".png" );
                    app.activeDocument.resizeImage( iconSizes[j][1], iconSizes[j][1], undefined, ResampleMethod.BICUBICSHARPER);
                    iconFile = new File( decodeURI(bundleFolder) + iconFilePath );

                    if ( args.length > 0 && args[0] === 'compressed' ) {
                        this.save( iconFile, true );
                    } else {
                        this.save( iconFile, false );
                    }

                }

            }

            iconDoc.close( SaveOptions.DONOTSAVECHANGES );


        }

    },

    getMaskPoints: function() {

        var width = parseInt( app.activeDocument.width, 10 ),
            height = parseInt( app.activeDocument.height, 10 ),
            middle = width / 2,
            points = [];

        points[0] = [
            [ middle, 0 ],
            [ width * 0.91796875, 0 ],
            [ width * 0.08203125, 0 ]
        ];

        points[1] = [
            [ width, middle ],
            [ width, height * 0.91796875 ],
            [ width, height * 0.08203125 ]
        ];

        points[2] = [
            [ middle, height ],
            [ width * 0.08203125, height ],
            [ width * 0.91796875, height ]
        ];

        points[3] = [
            [ 0, middle ],
            [ 0, height * 0.08203125 ],
            [ 0, height * 0.91796875 ]
        ];

        return points;

    },

    drawMask: function( points ) {

        var doc = app.activeDocument,
            lineArray = [],
            pathItem,
            makePathPoint,
            drawShape;

        makePathPoint = function( xy ) {
            var pathPoint = new PathPointInfo;
            pathPoint.kind = PointKind.CORNERPOINT;
            pathPoint.anchor = xy[0];
            pathPoint.leftDirection = xy[1];
            pathPoint.rightDirection = xy[2];
            return pathPoint;
        };

        makeSubPath = function( points ) {
            var subPath = new SubPathInfo();
            subPath.closed = true;
            subPath.operation = ShapeOperation.SHAPEADD;
            subPath.entireSubPath = points;
            return subPath;
        };

        for ( var i = 0, pointsLen = points.length; i < pointsLen; i++ ) {
            lineArray.push( makePathPoint( points[i] ) );
        }

        pathItem = doc.pathItems.add("myPath", [ makeSubPath( lineArray ) ]);

        pathItem.makeSelection();
        pathItem.remove();

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
    name: '1Password',
    bundle_id: 'com.agilebits.onepassword-ios',
    app_id: '1Password.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: '2048',
    bundle_id: 'com.ketchapp.2048',
    app_id: '2048.app',
    psd_id: false,
    icons: {
        appicon: true,
        icon: true,
        custom: [
            [ 'Icon_76', 76 ],
            [ 'Icon_120', 120 ],
            [ 'Icon_152', 152 ]
        ]
    }
});

mios.icons.push({
    name: '5s Gif',
    bundle_id: 'com.ericmarschner.5s',
    app_id: 'FiveSeconds.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: '8 Ball Pool',
    bundle_id: 'com.miniclip.8ballpoolmult',
    app_id: 'pool.app',
    psd_id: false,
    icons: {
        appicon: true,
        icon: true
    }
});

mios.icons.push({
    name: '9GAG',
    bundle_id: 'com.9gag.ios.mobile',
    app_id: '9GAG.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'ABC Watch',
    bundle_id: 'com.abcdigital.abc.videoplayer',
    app_id: 'WATCH ABC.app',
    psd_id: false,
    icons: {
        appicon: true,
        icon: true
    }
});

mios.icons.push({
    name: 'Accuweather',
    bundle_id: 'com.yourcompany.TestWithCustomTabs',
    app_id: 'AccuWeather.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Activator',
    bundle_id: 'libactivator',
    app_id: false,
    psd_id: false,
    mask: true,
    icons: {
        custom: [
            [ 'icon', 58 ],
            [ 'icon@2x', 120 ],
            [ 'icon-72', 120 ],
            [ 'Icon-152', 152 ],
            [ 'Icon-Small@2x', 58 ],
            [ 'Icon-Small-modern@2x', 58 ],
            [ 'Icon@2x-iOS7', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'Ally',
    bundle_id: 'com.ally.MobileBanking',
    app_id: 'Ally Bank.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Amazon',
    bundle_id: 'com.amazon.Amazon',
    app_id: 'Amazon.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Amazon FR',
    bundle_id: 'com.amazon.AmazonFR',
    app_id: 'Amazon.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Amazon UK',
    bundle_id: 'com.amazon.AmazonUK',
    app_id: 'Amazon.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Amazon Instant Video',
    bundle_id: 'com.amazon.aiv.AIVApp',
    app_id: 'InstantVideo.US.app',
    psd_id: false,
    icons: {
        icon: true
    }
});

mios.icons.push({
    name: 'AMEX',
    bundle_id: 'com.americanexpress.amexservice',
    app_id: 'Amex.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'icon', 60 ],
            [ 'icon@2x', 120 ],
            [ 'icon6', 57 ],
            [ 'icon6@2x', 114 ]
        ]
    }
});

mios.icons.push({
    name: 'amrc client for reddit',
    bundle_id: 'com.amleszk.amrc',
    app_id: 'amrc.app',
    psd_id: false,
    icons: {
        appicon: true,
        icon: true
    }
});

mios.icons.push({
    name: 'AppInfo',
    bundle_id: 'com.mileskabal.appinfo',
    app_id: 'appinfo.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'Icon', 60 ],
            [ 'Icon@2x', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Accounts - Backup',
    bundle_id: 'com.apple.accountsui',
    app_id: false,
    psd_id: 'apple_backup',
    mask: true,
    icons: {
        custom: [
            [ 'com.apple.Dataclass.Backup@2x', 58 ],
            [ 'com.apple.Dataclass.Backup@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Accounts - Bookmarks',
    bundle_id: 'com.apple.accountsui',
    app_id: false,
    psd_id: 'apple_safari',
    mask: true,
    icons: {
        custom: [
            [ 'com.apple.Dataclass.Bookmarks@2x', 58 ],
            [ 'com.apple.Dataclass.Bookmarks@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Accounts - Calendars',
    bundle_id: 'com.apple.accountsui',
    app_id: false,
    psd_id: 'apple_calendar',
    mask: true,
    icons: {
        custom: [
            [ 'com.apple.Dataclass.Calendars@2x', 58 ],
            [ 'com.apple.Dataclass.Calendars@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Accounts - CKDatabaseService',
    bundle_id: 'com.apple.accountsui',
    app_id: false,
    psd_id: 'apple_icloud',
    mask: true,
    icons: {
        custom: [
            [ 'com.apple.Dataclass.CKDatabaseService@2x', 58 ],
            [ 'com.apple.Dataclass.CKDatabaseService@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Accounts - Contacts',
    bundle_id: 'com.apple.accountsui',
    app_id: false,
    psd_id: 'apple_contacts',
    mask: true,
    icons: {
        custom: [
            [ 'com.apple.Dataclass.Contacts@2x', 58 ],
            [ 'com.apple.Dataclass.Contacts@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Accounts - Keychain Sync',
    bundle_id: 'com.apple.accountsui',
    app_id: false,
    psd_id: 'apple_keychain',
    mask: true,
    icons: {
        custom: [
            [ 'com.apple.Dataclass.KeychainSync@2x', 58 ],
            [ 'com.apple.Dataclass.KeychainSync@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Accounts - Mail',
    bundle_id: 'com.apple.accountsui',
    app_id: false,
    psd_id: 'apple_mail',
    mask: true,
    icons: {
        custom: [
            [ 'com.apple.Dataclass.Mail@2x', 58 ],
            [ 'com.apple.Dataclass.Mail@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Accounts - Media Stream',
    bundle_id: 'com.apple.accountsui',
    app_id: false,
    psd_id: 'apple_camera_roll',
    mask: true,
    icons: {
        custom: [
            [ 'com.apple.Dataclass.MediaStream@2x', 58 ],
            [ 'com.apple.Dataclass.MediaStream@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Accounts - Notes',
    bundle_id: 'com.apple.accountsui',
    app_id: false,
    psd_id: 'apple_notes',
    mask: true,
    icons: {
        custom: [
            [ 'com.apple.Dataclass.Notes@2x', 58 ],
            [ 'com.apple.Dataclass.Notes@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Accounts - Reminders',
    bundle_id: 'com.apple.accountsui',
    app_id: false,
    psd_id: 'apple_reminders',
    mask: true,
    icons: {
        custom: [
            [ 'com.apple.Dataclass.Reminders@2x', 58 ],
            [ 'com.apple.Dataclass.Reminders@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Accounts - Shoebox',
    bundle_id: 'com.apple.accountsui',
    app_id: false,
    psd_id: 'apple_passbook',
    mask: true,
    icons: {
        custom: [
            [ 'com.apple.Dataclass.Shoebox@2x', 58 ],
            [ 'com.apple.Dataclass.Shoebox@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Airport Utility',
    bundle_id: 'com.apple.airport.mobileairportutility',
    app_id: false,
    psd_id: 'apple_wifi',
    mask: true,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Apple App Store',
    bundle_id: 'com.apple.AppStore',
    app_id: 'AppStore.app',
    psd_id: 'apple_app_store',
    icons: {
        custom: [
            [ 'Appstore20', 20 ],
            [ 'Appstore29', 29 ],
            [ 'Appstore40', 40 ],
            [ 'Appstore58', 58 ],
            [ 'Appstore76', 76 ],
            [ 'Appstore80', 80 ],
            [ 'Appstore120', 120 ],
            [ 'Appstore152', 152 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Assistant',
    bundle_id: 'com.apple.AssistantServices',
    app_id: false,
    psd_id: 'apple_assistant',
    mask: true,
    icons: {
        custom: [
            [ 'settings_siri@2x', 58 ],
            [ 'settings_siri@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Assistant - Calendar',
    bundle_id: 'com.apple.assistant.System',
    app_id: false,
    psd_id: 'apple_calendar',
    mask: true,
    icons: {
        custom: [
            [ 'Calendar@2x', 120 ],
            [ 'Calendar@3x', 180 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Assistant - Movies',
    bundle_id: 'com.apple.assistant.System',
    app_id: false,
    psd_id: 'apple_videos',
    mask: true,
    icons: {
        custom: [
            [ 'Movies@2x', 120 ],
            [ 'Movies@3x', 180 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Assistant - QandA',
    bundle_id: 'com.apple.assistant.System',
    app_id: false,
    psd_id: 'apple_qa',
    mask: true,
    icons: {
        custom: [
            [ 'QandA@2x', 120 ],
            [ 'QandA@3x', 180 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Assistant - Restaurants',
    bundle_id: 'com.apple.assistant.System',
    app_id: false,
    psd_id: 'apple_restaurants',
    mask: true,
    icons: {
        custom: [
            [ 'Restaurants@2x', 120 ],
            [ 'Restaurants@3x', 180 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Assistant - Sports',
    bundle_id: 'com.apple.assistant.System',
    app_id: false,
    psd_id: 'apple_sports',
    mask: true,
    icons: {
        custom: [
            [ 'Sports@2x', 120 ],
            [ 'Sports@3x', 180 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Assistant - Twitter',
    bundle_id: 'com.apple.assistant.System',
    app_id: false,
    psd_id: 'twitter',
    mask: true,
    icons: {
        custom: [
            [ 'Twitter@2x', 120 ],
            [ 'Twitter@3x', 180 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Assistant - facebook',
    bundle_id: 'com.apple.assistant.System',
    app_id: false,
    psd_id: 'facebook',
    mask: true,
    icons: {
        custom: [
            [ 'facebook@2x', 120 ],
            [ 'facebook@3x', 180 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Calculator',
    bundle_id: 'com.apple.calculator',
    app_id: 'Calculator.app',
    psd_id: 'apple_calculator',
    icons: {
        custom: [
            [ 'icon-about@2x', 80 ],
            [ 'icon-spotlight@2x', 40 ],
            [ 'icon@2x', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Calendar',
    bundle_id: 'com.apple.mobilecal',
    app_id: 'MobileCal.app',
    psd_id: 'apple_calendar',
    icons: {
        custom: [
            [ 'icon-about@2x', 80 ],
            [ 'icon-about~ipad', 40 ],
            [ 'icon-settings@3x', 87 ],
            [ 'icon-spotlight@2x', 40 ],
            [ 'icon-spotlight~ipad', 20 ],
            [ 'icon@2x', 57 ],
            [ 'icon@2x~iphone', 114 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Camera',
    bundle_id: 'com.apple.camera',
    app_id: 'Camera.app',
    psd_id: 'apple_camera',
    icons: {
        custom: [
            [ 'Camera-Guides@2x', 80 ],
            [ 'Camera-NotificationCenter@2x', 40 ],
            [ 'Camera-settings@2x', 58 ],
            [ 'Camera@2x~iphone', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Camera Roll',
    bundle_id: 'com.apple.mobileslideshow',
    app_id: 'MobileSlideShow.app',
    psd_id: 'apple_camera_roll',
    icons: {
        custom: [
            [ 'Photos-Guides@2x', 80 ],
            [ 'Photos-NotificationCenter@2x', 40 ],
            [ 'Photos-settings@2x', 58 ],
            [ 'Photos@2x~iphone', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Clock',
    bundle_id: 'com.apple.springboard',
    app_id: false,
    psd_id: 'apple_clock',
    icons: {
        custom: [
            [ 'ClockIconBackgroundSquare@2x~iphone-iOS7', 120 ],
            [ 'ClockIconBackgroundSquare@2x~iphone', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Clock Alt',
    bundle_id: 'com.apple.springboard',
    app_id: false,
    psd_id: 'apple_clock_alt',
    folder: '/alt',
    icons: {
        custom: [
            [ 'ClockIconBackgroundSquare@2x~iphone-iOS7', 120 ],
            [ 'ClockIconBackgroundSquare@2x~iphone', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Compass',
    bundle_id: 'com.apple.compass',
    app_id: 'Compass.app',
    psd_id: 'apple_compass',
    icons: {
        appicon: true,
        custom: [
            [ 'icon-about@2x', 80 ],
            [ 'icon-spotlight@2x', 40 ],
            [ 'icon-table@2x', 58 ],
            [ 'icon@2x~iphone', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Contacts',
    bundle_id: 'com.apple.MobileAddressBook',
    app_id: 'Contacts.app',
    psd_id: 'apple_contacts',
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Apple Facetime',
    bundle_id: 'com.apple.facetime',
    app_id: 'FaceTime.app',
    psd_id: 'apple_facetime',
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Apple Find My Friends',
    bundle_id: 'com.apple.mobileme.fmf1',
    app_id: 'FindMyFriends.app',
    psd_id: 'apple_find_my_friends',
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Apple Find My iPhone',
    bundle_id: 'com.apple.mobileme.fmip1',
    app_id: 'FindMyiPhone.app',
    psd_id: 'apple_find_my_iphone',
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Apple Find My iPhone',
    bundle_id: 'com.apple.castlesettings',
    app_id: 'FindMyiPhone.app',
    psd_id: 'apple_find_my_iphone',
    mask: true,
    icons: {
        custom: [
            [ 'fmip@2x', 58 ],
            [ 'fmip@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Game Center',
    bundle_id: 'com.apple.gamecenter',
    app_id: 'Game Center.app',
    psd_id: 'apple_game_center',
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Apple Garage Band',
    bundle_id: 'com.apple.mobilegarageband',
    app_id: 'MobileGarageBand.app',
    psd_id: 'apple_garage_band',
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Apple Health',
    bundle_id: 'com.apple.Health',
    app_id: 'Health.app',
    psd_id: 'apple_health',
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Apple iBooks',
    bundle_id: 'com.apple.iBooks',
    app_id: 'iBooks.app',
    psd_id: 'apple_ibooks',
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Apple iMovie',
    bundle_id: 'com.apple.iMovie',
    app_id: 'iMovie.app',
    psd_id: 'apple_imovie',
    icons: {
        appicon: true,
        custom: [
            [ 'iMovieTheater_Icon', 76 ],
            [ 'iMovieTheater_Icon@2x', 152 ],
            [ 'iMovieTheater_Icon@2x~iphone', 120 ],
            [ 'iMovieTheater_Icon@3x', 228 ],
            [ 'iMovieTheater_Icon@3x~iphone', 120 ],
            [ 'iMovieTheater_Icon~iphone', 60 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple iTunes Store',
    bundle_id: 'com.apple.MobileStore',
    app_id: 'MobileStore.app',
    psd_id: 'apple_itunes_store',
    icons: {
        custom: [
            [ 'iTunesStore20', 20 ],
            [ 'iTunesStore29', 29 ],
            [ 'iTunesStore40', 40 ],
            [ 'iTunesStore58', 58 ],
            [ 'iTunesStore76', 76 ],
            [ 'iTunesStore80', 80 ],
            [ 'iTunesStore120', 120 ],
            [ 'iTunesStore152', 152 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple iTunes University',
    bundle_id: 'com.apple.itunesu',
    app_id: 'iTunesU.app',
    psd_id: 'apple_itunes_u',
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Apple Keynote',
    bundle_id: 'com.apple.Keynote',
    app_id: 'Keynote.app',
    psd_id: 'apple_keynote',
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Apple Mail',
    bundle_id: 'com.apple.mobilemail',
    app_id: 'MobileMail.app',
    psd_id: 'apple_mail',
    icons: {
        custom: [
            [ 'Icon-20~ipad', 20 ],
            [ 'Icon-20@2x', 40 ],
            [ 'Icon-20@3x', 60 ],
            [ 'Icon-40@2x', 80 ],
            [ 'Icon-40@3x', 120 ],
            [ 'Icon-76@2x~ipad', 152 ],
            [ 'Icon-76@3x~ipad', 228 ],
            [ 'Icon-Small@2x', 58 ],
            [ 'Icon-Small@3x', 87 ],
            [ 'Icon@2x', 144 ],
            [ 'Icon@3x', 216 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Maps',
    bundle_id: 'com.apple.Maps',
    app_id: 'Maps.app',
    psd_id: 'apple_maps',
    icons: {
        custom: [
            [ 'Icon-20', 20 ],
            [ 'Icon-29', 29 ],
            [ 'Icon-40', 40 ],
            [ 'Icon-58', 58 ],
            [ 'Icon-76', 76 ],
            [ 'Icon-80', 80 ],
            [ 'Icon-120', 120 ],
            [ 'Icon-152', 152 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Music',
    bundle_id: 'com.apple.Music',
    app_id: 'Music.app',
    psd_id: 'apple_music',
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Apple Notes',
    bundle_id: 'com.apple.mobilenotes',
    app_id: 'MobileNotes.app',
    psd_id: 'apple_notes',
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Apple Numbers',
    bundle_id: 'com.apple.Numbers',
    app_id: 'Numbers.app',
    psd_id: 'apple_numbers',
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Apple Pages',
    bundle_id: 'com.apple.Pages',
    app_id: 'Pages.app',
    psd_id: 'apple_pages',
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Apple Passbook',
    bundle_id: 'com.apple.Passbook',
    app_id: 'Passbook.app',
    psd_id: 'apple_passbook',
    icons: {
        icon: true
    }
});

mios.icons.push({
    name: 'Apple Phone',
    bundle_id: 'com.apple.mobilephone',
    app_id: 'MobilePhone.app',
    psd_id: 'apple_phone',
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Apple Podcasts',
    bundle_id: 'com.apple.podcasts',
    app_id: 'Podcasts.app',
    psd_id: 'apple_podcasts',
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Apple Preferences',
    bundle_id: 'com.apple.Preferences',
    app_id: 'Preferences.app',
    psd_id: 'apple_preferences',
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Apple Preferences - Airplane Mode',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'apple_airplane_mode',
    mask: true,
    icons: {
        custom: [
            [ 'AirplaneMode~ipad', 29 ],
            [ 'AirplaneMode@2x', 58 ],
            [ 'AirplaneMode@2x~ipad', 58 ],
            [ 'AirplaneMode@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - App Store',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'apple_app_store',
    mask: true,
    icons: {
        custom: [
            [ 'AppStore~ipad', 29 ],
            [ 'AppStore@2x', 58 ],
            [ 'AppStore@2x~ipad', 58 ],
            [ 'AppStore@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - Bluetooth',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'apple_bluetooth',
    mask: true,
    icons: {
        custom: [
            [ 'Bluetooth~ipad', 29 ],
            [ 'Bluetooth@2x', 58 ],
            [ 'Bluetooth@2x~ipad', 58 ],
            [ 'Bluetooth@3x', 87 ],
            [ 'BluetoothSharing~ipad', 29 ],
            [ 'BluetoothSharing@2x', 58 ],
            [ 'BluetoothSharing@2x~ipad', 58 ],
            [ 'BluetoothSharing@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - Calendar',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'apple_calendar',
    mask: true,
    icons: {
        custom: [
            [ 'Calendar~ipad', 29 ],
            [ 'Calendar@2x', 58 ],
            [ 'Calendar@2x~ipad', 58 ],
            [ 'Calendar@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - Camera',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'apple_camera',
    mask: true,
    icons: {
        custom: [
            [ 'Camera~ipad', 29 ],
            [ 'Camera@2x', 58 ],
            [ 'Camera@2x~ipad', 58 ],
            [ 'Camera@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - Carrier',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'apple_carrier',
    mask: true,
    icons: {
        custom: [
            [ 'Carrier~ipad', 29 ],
            [ 'Carrier@2x', 58 ],
            [ 'Carrier@2x~ipad', 58 ],
            [ 'Carrier@3x', 87 ],
            [ 'CarrierSettings~ipad', 29 ],
            [ 'CarrierSettings@2x', 58 ],
            [ 'CarrierSettings@2x~ipad', 58 ],
            [ 'CarrierSettings@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - Cellular Data',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'apple_cellular',
    mask: true,
    icons: {
        custom: [
            [ 'CellularData~ipad', 29 ],
            [ 'CellularData@2x', 58 ],
            [ 'CellularData@2x~ipad', 58 ],
            [ 'CellularData@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - Compass',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'apple_compass',
    mask: true,
    icons: {
        custom: [
            [ 'Compass~ipad', 29 ],
            [ 'Compass@2x', 58 ],
            [ 'Compass@2x~ipad', 58 ],
            [ 'Compass@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - Contacts',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'apple_contacts',
    mask: true,
    icons: {
        custom: [
            [ 'Contacts~ipad', 29 ],
            [ 'Contacts@2x', 58 ],
            [ 'Contacts@2x~ipad', 58 ],
            [ 'Contacts@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - Control Center',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'apple_control_center',
    mask: true,
    icons: {
        custom: [
            [ 'ControlCenter~ipad', 29 ],
            [ 'ControlCenter@2x', 58 ],
            [ 'ControlCenter@2x~ipad', 58 ],
            [ 'ControlCenter@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - Developer',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'apple_developer',
    mask: true,
    icons: {
        custom: [
            [ 'DeveloperSettings~ipad', 29 ],
            [ 'DeveloperSettings@2x', 58 ],
            [ 'DeveloperSettings@2x~ipad', 58 ],
            [ 'DeveloperSettings@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - Display',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'apple_display',
    mask: true,
    icons: {
        custom: [
            [ 'Display~ipad', 29 ],
            [ 'Display@2x', 58 ],
            [ 'Display@2x~ipad', 58 ],
            [ 'Display@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - Do Not Disturb',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'apple_dnd',
    mask: true,
    icons: {
        custom: [
            [ 'DND~ipad', 29 ],
            [ 'DND@2x', 58 ],
            [ 'DND@2x~ipad', 58 ],
            [ 'DND@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - Facetime',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'apple_facetime',
    mask: true,
    icons: {
        custom: [
            [ 'FaceTime~ipad', 29 ],
            [ 'FaceTime@2x', 58 ],
            [ 'FaceTime@2x~ipad', 58 ],
            [ 'FaceTime@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - Facebook',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'facebook',
    mask: true,
    icons: {
        custom: [
            [ 'FacebookSettings~ipad', 29 ],
            [ 'FacebookSettings@2x', 58 ],
            [ 'FacebookSettings@2x~ipad', 58 ],
            [ 'FacebookSettings@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - Facebook',
    bundle_id: 'com.apple.FacebookSettings',
    app_id: false,
    psd_id: 'facebook',
    icons: {
        custom: [
            [ 'FacebookIcon@2x', 120 ],
            [ 'FacebookIcon@3x', 180 ],
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - Find My iPhone',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'apple_find_my_iphone',
    mask: true,
    icons: {
        custom: [
            [ 'FindMyiPhone~ipad', 29 ],
            [ 'FindMyiPhone@2x', 58 ],
            [ 'FindMyiPhone@2x~ipad', 58 ],
            [ 'FindMyiPhone@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - Flickr',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'flickr',
    mask: true,
    icons: {
        custom: [
            [ 'FlickrSettings~ipad', 29 ],
            [ 'FlickrSettings@2x', 58 ],
            [ 'FlickrSettings@2x~ipad', 58 ],
            [ 'FlickrSettings@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - Game Center',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'apple_game_center',
    mask: true,
    icons: {
        custom: [
            [ 'GameCenter~ipad', 29 ],
            [ 'GameCenter@2x', 58 ],
            [ 'GameCenter@2x~ipad', 58 ],
            [ 'GameCenter@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - General',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'apple_general',
    mask: true,
    icons: {
        custom: [
            [ 'General~ipad', 29 ],
            [ 'General@2x', 58 ],
            [ 'General@2x~ipad', 58 ],
            [ 'General@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - Health',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'apple_health',
    mask: true,
    icons: {
        custom: [
            [ 'Health~ipad', 29 ],
            [ 'Health@2x', 58 ],
            [ 'Health@2x~ipad', 58 ],
            [ 'Health@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - Home Data',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'apple_home_data',
    mask: true,
    icons: {
        custom: [
            [ 'HomeData~ipad', 29 ],
            [ 'HomeData@2x', 58 ],
            [ 'HomeData@2x~ipad', 58 ],
            [ 'HomeData@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - iCloud',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'apple_icloud',
    mask: true,
    icons: {
        custom: [
            [ 'iCloud~ipad', 29 ],
            [ 'iCloud@2x', 58 ],
            [ 'iCloud@2x~ipad', 58 ],
            [ 'iCloud@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - iTunes',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'apple_itunes_store',
    mask: true,
    icons: {
        custom: [
            [ 'iTunes~ipad', 29 ],
            [ 'iTunes@2x', 58 ],
            [ 'iTunes@2x~ipad', 58 ],
            [ 'iTunes@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - Location',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'apple_location',
    mask: true,
    icons: {
        custom: [
            [ 'Location~ipad', 29 ],
            [ 'Location@2x', 58 ],
            [ 'Location@2x~ipad', 58 ],
            [ 'Location@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - Mail',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'apple_mail',
    mask: true,
    icons: {
        custom: [
            [ 'Mail~ipad', 29 ],
            [ 'Mail@2x', 58 ],
            [ 'Mail@2x~ipad', 58 ],
            [ 'Mail@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - Maps',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'apple_maps',
    mask: true,
    icons: {
        custom: [
            [ 'Maps~ipad', 29 ],
            [ 'Maps@2x', 58 ],
            [ 'Maps@2x~ipad', 58 ],
            [ 'Maps@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - Messages',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'apple_sms',
    mask: true,
    icons: {
        custom: [
            [ 'Messages~ipad', 29 ],
            [ 'Messages@2x', 58 ],
            [ 'Messages@2x~ipad', 58 ],
            [ 'Messages@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - Microphone',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'apple_microphone',
    mask: true,
    icons: {
        custom: [
            [ 'Microphone~ipad', 29 ],
            [ 'Microphone@2x', 58 ],
            [ 'Microphone@2x~ipad', 58 ],
            [ 'Microphone@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - Motion',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'apple_motion',
    mask: true,
    icons: {
        custom: [
            [ 'Motion~ipad', 29 ],
            [ 'Motion@2x', 58 ],
            [ 'Motion@2x~ipad', 58 ],
            [ 'Motion@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - Music',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'apple_music',
    mask: true,
    icons: {
        custom: [
            [ 'Music~ipad', 29 ],
            [ 'Music@2x', 58 ],
            [ 'Music@2x~ipad', 58 ],
            [ 'Music@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - Newsstand',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: false,
    mask: true,
    icons: {
        custom: [
            [ 'Newsstand-en~ipad', 29 ],
            [ 'Newsstand-en@2x', 58 ],
            [ 'Newsstand-en@2x~ipad', 58 ],
            [ 'Newsstand-en@3x', 87 ],
            [ 'Newsstand~ipad', 29 ],
            [ 'Newsstand@2x', 58 ],
            [ 'Newsstand@2x~ipad', 58 ],
            [ 'Newsstand@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - Notes',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'apple_notes',
    mask: true,
    icons: {
        custom: [
            [ 'Notes~ipad', 29 ],
            [ 'Notes@2x', 58 ],
            [ 'Notes@2x~ipad', 58 ],
            [ 'Notes@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - Notification Center',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'apple_notifications',
    mask: true,
    icons: {
        custom: [
            [ 'NotificationCenter~ipad', 29 ],
            [ 'NotificationCenter@2x', 58 ],
            [ 'NotificationCenter@2x~ipad', 58 ],
            [ 'NotificationCenter@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - Passcode',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'apple_passcode',
    mask: true,
    icons: {
        custom: [
            [ 'Passcode~ipad', 29 ],
            [ 'Passcode@2x', 58 ],
            [ 'Passcode@2x~ipad', 58 ],
            [ 'Passcode@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - Passbook',
    bundle_id: 'com.apple.PassKitCore',
    app_id: false,
    psd_id: 'apple_passbook',
    mask: true,
    icons: {
        custom: [
            [ 'Icon', 60 ],
            [ 'Icon@2x', 120 ],
            [ 'Icon@3x', 180 ],
            [ 'Icon-Small@2x', 58 ],
            [ 'Icon-Small@3x', 87 ],
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - Personal Hotspot',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'apple_personal_hotspot',
    mask: true,
    icons: {
        custom: [
            [ 'PersonalHotspot~ipad', 29 ],
            [ 'PersonalHotspot@2x', 58 ],
            [ 'PersonalHotspot@2x~ipad', 58 ],
            [ 'PersonalHotspot@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - Phone',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'apple_phone',
    mask: true,
    icons: {
        custom: [
            [ 'Phone~ipad', 29 ],
            [ 'Phone@2x', 58 ],
            [ 'Phone@2x~ipad', 58 ],
            [ 'Phone@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - Photos',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'apple_camera_roll',
    mask: true,
    icons: {
        custom: [
            [ 'Photos~ipad', 29 ],
            [ 'Photos@2x', 58 ],
            [ 'Photos@2x~ipad', 58 ],
            [ 'Photos@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - Privacy',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'apple_privacy',
    mask: true,
    icons: {
        custom: [
            [ 'Privacy~ipad', 29 ],
            [ 'Privacy@2x', 58 ],
            [ 'Privacy@2x~ipad', 58 ],
            [ 'Privacy@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - Reminders',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'apple_reminders',
    mask: true,
    icons: {
        custom: [
            [ 'Reminders~ipad', 29 ],
            [ 'Reminders@2x', 58 ],
            [ 'Reminders@2x~ipad', 58 ],
            [ 'Reminders@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - Safari',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'apple_safari',
    mask: true,
    icons: {
        custom: [
            [ 'Safari~ipad', 29 ],
            [ 'Safari@2x', 58 ],
            [ 'Safari@2x~ipad', 58 ],
            [ 'Safari@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - Sounds',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'apple_sounds',
    mask: true,
    icons: {
        custom: [
            [ 'Sounds~ipad', 29 ],
            [ 'Sounds@2x', 58 ],
            [ 'Sounds@2x~ipad', 58 ],
            [ 'Sounds@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - TouchID',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'apple_touchid',
    mask: true,
    icons: {
        custom: [
            [ 'TouchID~ipad', 29 ],
            [ 'TouchID@2x', 58 ],
            [ 'TouchID@2x~ipad', 58 ],
            [ 'TouchID@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - Twitter',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'twitter',
    mask: true,
    icons: {
        custom: [
            [ 'Twitter~ipad', 29 ],
            [ 'Twitter@2x', 58 ],
            [ 'Twitter@2x~ipad', 58 ],
            [ 'Twitter@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - Victoria',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'nike_plus',
    mask: true,
    icons: {
        custom: [
            [ 'Victoria~ipad', 29 ],
            [ 'Victoria@2x', 58 ],
            [ 'Victoria@2x~ipad', 58 ],
            [ 'Victoria@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - Video',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'apple_videos',
    mask: true,
    icons: {
        custom: [
            [ 'Video~ipad', 29 ],
            [ 'Video@2x', 58 ],
            [ 'Video@2x~ipad', 58 ],
            [ 'Video@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - VPN',
    bundle_id: 'com.apple.VPNPreferences',
    app_id: false,
    psd_id: 'apple_vpn',
    mask: true,
    icons: {
        custom: [
            [ 'VPN~ipad', 29 ],
            [ 'VPN@2x', 58 ],
            [ 'VPN@2x~ipad', 58 ],
            [ 'VPN@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - Wallpaper',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'apple_wallpaper',
    mask: true,
    icons: {
        custom: [
            [ 'Wallpaper~ipad', 29 ],
            [ 'Wallpaper@2x', 58 ],
            [ 'Wallpaper@2x~ipad', 58 ],
            [ 'Wallpaper@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - Weibo',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'weibo',
    mask: true,
    icons: {
        custom: [
            [ 'Weibo~ipad', 29 ],
            [ 'Weibo@2x', 58 ],
            [ 'Weibo@2x~ipad', 58 ],
            [ 'Weibo@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Preferences - WiFi',
    bundle_id: 'com.apple.Preferences',
    app_id: false,
    psd_id: 'apple_wifi',
    mask: true,
    icons: {
        custom: [
            [ 'WiFi~ipad', 29 ],
            [ 'WiFi@2x', 58 ],
            [ 'WiFi@2x~ipad', 58 ],
            [ 'WiFi@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Reminders',
    bundle_id: 'com.apple.reminders',
    app_id: 'Reminders.app',
    psd_id: 'apple_reminders',
    icons: {
        custom: [
            [ 'icon@2x~iphone', 120 ],
            [ 'icon@3x~iphone', 180 ],
            [ 'settingsIcon@2x', 58 ],
            [ 'settingsIcon@3x', 87 ],
            [ 'spotlightIcon@2x', 80 ],
            [ 'spotlightIcon@3x', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Remote',
    bundle_id: 'com.apple.Remote',
    app_id: 'Remote.app',
    psd_id: 'apple_remote',
    icons: {
        appicon: true,
        icon: true,
        custom: [
            [ 'Remote29', 29 ],
            [ 'Remote40', 40 ],
            [ 'Remote57', 57 ],
            [ 'Remote58', 58 ],
            [ 'Remote60', 60 ],
            [ 'Remote72', 72 ],
            [ 'Remote76', 76 ],
            [ 'Remote80', 80 ],
            [ 'Remote120', 120 ],
            [ 'Remote152', 152 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Safari',
    bundle_id: 'com.apple.mobilesafari',
    app_id: 'MobileSafari.app',
    psd_id: 'apple_safari',
    icons: {
        custom: [
            [ 'icon-about@2x', 80 ],
            [ 'icon-about@3x', 120 ],
            [ 'icon-spotlight@2x', 40 ],
            [ 'icon-spotlight@3x', 60 ],
            [ 'icon-table@2x', 58 ],
            [ 'icon-table@3x', 87 ],
            [ 'icon@2x~iphone', 120 ],
            [ 'icon@3x~iphone', 180 ]
        ]
    }
});

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

mios.icons.push({
    name: 'Apple Stocks',
    bundle_id: 'com.apple.stocks',
    app_id: 'Stocks.app',
    psd_id: 'apple_stock',
    icons: {
        custom: [
            [ 'icon-about@2x~iphone', 80 ],
            [ 'icon-spotlight@2x~iphone', 40 ],
            [ 'icon-table@2x', 58 ],
            [ 'icon@2x~iphone', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Store',
    bundle_id: 'com.apple.store.Jolly',
    app_id: 'Apple Store.app',
    psd_id: 'apple_store',
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Apple TestFlight',
    bundle_id: 'com.apple.TestFlight',
    app_id: 'TestFlight.app',
    psd_id: 'apple_testflight',
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Apple Tips',
    bundle_id: 'com.apple.tips',
    app_id: 'Tips.app',
    psd_id: 'apple_tips',
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Apple Trailers',
    bundle_id: 'com.apple.movietrailers',
    app_id: false,
    psd_id: 'apple_trailers',
    icons: {
        appicon: true,
        custom: [
            [ 'Trailers29', 29 ],
            [ 'Trailers40', 40 ],
            [ 'Trailers57', 57 ],
            [ 'Trailers58', 58 ],
            [ 'Trailers60', 60 ],
            [ 'Trailers72', 72 ],
            [ 'Trailers76', 76 ],
            [ 'Trailers80', 80 ],
            [ 'Trailers120', 120 ],
            [ 'Trailers152', 152 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Videos',
    bundle_id: 'com.apple.videos',
    app_id: 'Videos.app',
    psd_id: 'apple_videos',
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Apple Voice Memos',
    bundle_id: 'com.apple.VoiceMemos',
    app_id: 'VoiceMemos.app',
    psd_id: 'apple_voice_memos',
    icons: {
        custom: [
            [ 'icon@2x', 120 ],
            [ 'icon@3x', 180 ]
        ]
    }
});

mios.icons.push({
    name: 'Apple Weather',
    bundle_id: 'com.apple.weather',
    app_id: 'Weather.app',
    psd_id: 'apple_weather',
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Ask.fm',
    bundle_id: 'fm.ask.askfm',
    app_id: 'askfm.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Audible Audiobooks',
    bundle_id: 'com.audible.iphone',
    app_id: 'Audible.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Authy',
    bundle_id: 'com.authy',
    app_id: 'authy.app',
    psd_id: false,
    icons: {
        appicon: true,
        custom: [
            [ 'icon_29x29', 29 ],
            [ 'icon_40x40', 40 ],
            [ 'icon_50x50', 50 ],
            [ 'icon_57x57', 57 ],
            [ 'icon_58x58', 58 ],
            [ 'icon_72x72', 72 ],
            [ 'icon_76x76', 76 ],
            [ 'icon_80x80', 80 ],
            [ 'icon_100x100', 100 ],
            [ 'icon_114x114', 114 ],
            [ 'icon_120x120', 120 ],
            [ 'icon_144x144', 144 ],
            [ 'icon_152x152', 152 ]
        ]
    }
});

mios.icons.push({
    name: 'Aviary Photo Editor',
    bundle_id: 'com.aviary.Photo-Editor',
    app_id: 'Photo Editor.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Badoo',
    bundle_id: 'com.badoo.Badoo',
    app_id: 'Badoo.app',
    psd_id: false,
    icons: {
        appicon: true,
        icon: true,
        custom: [
            [ 'Icon-120', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'Bandsintown',
    bundle_id: 'com.bandsintown.bit',
    app_id: 'Bandsintown Concerts.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'Icon-Small-iOS7@2x', 80 ],
            [ 'Icon-Small', 29 ],
            [ 'Icon-Small@2x', 58 ],
            [ 'Icon-iOS7', 60 ],
            [ 'Icon-iOS7@2x', 120 ],
            [ 'Icon', 60 ],
            [ 'Icon@2x', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'Bank of America',
    bundle_id: 'com.bankofamerica.BofA',
    app_id: 'BofA.app',
    psd_id: false,
    icons: {
        icon: true
    }
});

mios.icons.push({
    name: 'Battery Doctor',
    bundle_id: 'com.ksmobile.batterydoctor',
    app_id: 'BatterySaver.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'icon-120@2x', 120 ],
            [ 'icon', 60 ],
            [ 'icon@2x', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'BatteryLife',
    bundle_id: 'com.rbt.batteryLifeApp',
    app_id: 'BatteryLife.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'BBC News US',
    bundle_id: 'uk.co.bbc.news',
    app_id: 'BBCNews.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'Icon-iPad', 72 ],
            [ 'Icon-iPad@2x', 144 ],
            [ 'Icon', 60 ],
            [ 'Icon@2x', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'Beats',
    bundle_id: 'com.beatsmusic.BeatsMusic',
    app_id: 'BeatsMusic.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'BikeRaceTFG',
    bundle_id: 'com.topfreegames.bikeracefree',
    app_id: 'moto.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'icone-120', 120 ],
            [ 'icone-72', 72 ],
            [ 'icone-72@2x', 144 ],
            [ 'icone-76', 76 ],
            [ 'icone-76@2x', 152 ],
            [ 'icone', 57 ],
            [ 'icone@2x', 114 ]
        ]
    }
});

mios.icons.push({
    name: 'Bitmoji',
    bundle_id: 'com.bitstrips.imoji',
    app_id: 'imojiStore.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Bleacher Report',
    bundle_id: 'com.bleacherreport.TeamStream',
    app_id: 'Team Stream.app ',
    psd_id: false,
    icons: {
        icon: true,
        custom: [
            [ 'Icon-57', 57 ],
            [ 'Icon-57@2x', 114 ],
            [ 'Icon-HD-40', 40 ],
            [ 'Icon-HD-40@2x', 80 ],
            [ 'Icon-HD-72', 72 ],
            [ 'Icon-HD-72@2x', 144 ],
            [ 'Icon-HD-76', 76 ],
            [ 'Icon-HD-76@2x', 152 ],
            [ 'Icon-HD-Small-50', 50 ],
            [ 'Icon-HD-Small-50@2x', 100 ],
            [ 'Icon-HD-Small', 1234 ],
            [ 'Icon-HD-Small@2x', 1234 ]
        ]
    }
});

mios.icons.push({
    name: 'Boom Beach',
    bundle_id: 'com.supercell.reef',
    app_id: 'Boom Beach.app',
    psd_id: false,
    icons: {
        icon: true,
        custom: [
            [ 'Icon-40', 40 ],
            [ 'Icon-80', 80 ],
            [ 'Icon-120', 120 ],
            [ 'Icon-144', 144 ],
            [ 'Icon-152', 152 ]
        ]
    }
});

mios.icons.push({
    name: 'Box',
    bundle_id: 'net.box.BoxNet',
    app_id: 'Box.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'BuzzFeed',
    bundle_id: 'com.buzzfeed.buzzfeed',
    app_id: 'buzzfeed.app ',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Bytafont 2',
    bundle_id: 'com.bytafont.BytaFont2',
    app_id: 'BytaFont2.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Calenmob',
    bundle_id: 'com.btgs.calenmobfree',
    app_id: 'CalenMob.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'AppIcon_Free60x60@2x', 120 ],
            [ 'AppIcon_Free60x60@3x', 180 ],
            [ 'AppIcon_Free76x76@2x~ipad', 152 ],
            [ 'AppIcon_Free76x76~ipad', 76 ],
            [ 'icon_60', 60 ],
            [ 'icon_60@2x', 120 ],
            [ 'icon_60@3x', 180 ],
            [ 'icon_60_free', 60 ],
            [ 'icon_60_free@2x', 120 ],
            [ 'icon_60_free@3x', 180 ],
            [ 'icon_76', 76 ],
            [ 'icon_76@2x', 152 ],
            [ 'icon_76_free', 76 ],
            [ 'icon_76_free@2x', 152 ]
        ]
    }
});

mios.icons.push({
    name: 'Canvas',
    bundle_id: 'com.instructure.icanvas',
    app_id: 'iCanvas.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Capital One',
    bundle_id: 'com.capitalone.enterprisemobilebanking',
    app_id: 'EnterpriseMobileBanking.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'Icon-120px', 120 ],
            [ 'Icon-small', 29 ],
            [ 'Icon', 60 ],
            [ 'Icon@2x', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'CBS Sports',
    bundle_id: 'H443NM7F8H.CBSSportsApp',
    app_id: 'CBS Sports.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Chase',
    bundle_id: 'com.chase',
    app_id: 'Chase.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'ChaseAppIcons29x29', 29 ],
            [ 'ChaseAppIcons29x29@2x', 58 ],
            [ 'ChaseAppIcons29x29@2x~ipad', 58 ],
            [ 'ChaseAppIcons29x29~ipad', 29 ],
            [ 'ChaseAppIcons40x40@2x', 80 ],
            [ 'ChaseAppIcons40x40@2x~ipad', 80 ],
            [ 'ChaseAppIcons50x50@2x~ipad', 100 ],
            [ 'ChaseAppIcons50x50~ipad', 50 ],
            [ 'ChaseAppIcons57x57', 57 ],
            [ 'ChaseAppIcons57x57@2x', 114 ],
            [ 'ChaseAppIcons60x60@2x', 120 ],
            [ 'ChaseAppIcons72x72@2x~ipad', 144 ],
            [ 'ChaseAppIcons72x72~ipad', 72 ]
        ]
    }
});

mios.icons.push({
    name: 'Cisco AnyConnect',
    bundle_id: 'com.cisco.anyconnect.gui',
    app_id: 'AnyConnect.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'AnyConnectIcon-iPad', 72 ],
            [ 'AnyConnectIcon-iPad@2x', 144 ],
            [ 'AnyConnectIcon', 57 ],
            [ 'AnyConnectIcon@2x', 114 ],
            [ 'AnyConnectIconTransparent', 72 ],
            [ 'AnyConnectIconTransparent@2x', 114 ]
        ]
    }
});

mios.icons.push({
    name: 'Citi',
    bundle_id: 'com.citigroup.citimobile',
    app_id: 'Citibank.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'icon', 60 ],
            [ 'icon@2x', 120 ],
            [ 'icon-120@2x', 120 ],
            [ 'icon-180@2x', 180 ]
        ]
    }
});

mios.icons.push({
    name: 'Clash of Clans',
    bundle_id: 'com.supercell.magic',
    app_id: 'Clash of Clans.app',
    psd_id: false,
    icons: {
        icon: true,
        custom: [
            [ 'icon_16px', 16 ],
            [ 'icon_24px', 24 ],
            [ 'icon_32px', 32 ],
            [ 'icon_36px', 36 ],
            [ 'icon_64px', 64 ],
            [ 'Icon-57', 57 ],
            [ 'Icon-72-1', 72 ],
            [ 'Icon-80', 80 ],
            [ 'Icon-100', 100 ],
            [ 'Icon-120', 120 ],
            [ 'Icon-144', 144 ],
            [ 'Icon-152', 152 ]
        ]
    }
});

mios.icons.push({
    name: 'Clear',
    bundle_id: 'com.realmacsoftware.clear',
    app_id: 'Clear.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Clima',
    bundle_id: 'com.littlebigcode.Clima',
    app_id: false,
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'CloudApp',
    bundle_id: 'com.jackietran.Cloudier',
    app_id: 'Cloudier.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'Icon-New-small', 57 ],
            [ 'Icon-New', 114 ],
            [ 'Icon-Small', 57 ],
            [ 'Icon', 114 ]
        ]
    }
});

mios.icons.push({
    name: 'CloudMagic Email',
    bundle_id: 'com.CloudMagic.Mail',
    app_id: 'CloudMagic.app',
    psd_id: false,
    icons: {
        appicon: true,
        icon: true,
        custom: [
            [ 'App_icon_non_retina', 60 ],
            [ 'App_icon_retina', 120 ],
            [ 'App_icon_retina_120', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'Coastal',
    bundle_id: 'com.ncr.coastalfcusub',
    app_id: 'Coastal_cfcu.app ',
    psd_id: false,
    icons: {
        custom: [
            [ 'appicon-60@2x', 120 ],
            [ 'appicon-60@3x', 180 ],
            [ 'appicon', 57 ],
            [ 'appicon@2x', 114 ]
        ]
    }
});

mios.icons.push({
    name: 'Comedy Central',
    bundle_id: 'com.mtvn.ccnetwork',
    app_id: 'ccnetwork.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Comedy Central Stand-Up',
    bundle_id: 'com.mtvn.ccstandup',
    app_id: 'CCStandUp.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'icon@2x~ipad', 120 ],
            [ 'icon@2x~iphone', 120 ],
            [ 'icon~ipad', 60 ],
            [ 'icon~iphone', 60 ]
        ]
    }
});

mios.icons.push({
    name: 'CommBank',
    bundle_id: 'au.com.commbank.commbank',
    app_id: 'CommBankProd.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Convertbot',
    bundle_id: 'com.tapbots.Convertbot',
    app_id: 'Convertbot.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'AppIcon', 60 ],
            [ 'AppIcon@2x', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'Credit Karma',
    bundle_id: 'com.creditkarma.mobile',
    app_id: 'Credit Karma.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Crunchyroll',
    bundle_id: 'com.crunchyroll.iphone',
    app_id: 'Crunchyroll.app',
    psd_id: false,
    icons: {
        appicon: true,
        custom: [
            [ '57x57', 57 ],
            [ '72x72', 72 ],
            [ '76x76', 76 ],
            [ '114x114', 114 ],
            [ '120x120', 120 ],
            [ '144x144', 144 ],
            [ '152x152', 152 ]
        ]
    }
});

mios.icons.push({
    name: 'Curb',
    bundle_id: 'com.ridecharge.TaxiMagic',
    app_id: 'Curb.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'CVS',
    bundle_id: 'com.cvs.cvspharmacy',
    app_id: 'CVSOnlineiPhone.app',
    psd_id: false,
    icons: {
        icon: true,
        custom: [
            [ 'app_icon(120x120)_option2@2x', 120 ],
            [ 'app_icon_option2', 57 ],
            [ 'app_icon_option2@2x', 114 ],
            [ 'appIcon120', 120 ],
            [ 'appIcon58', 58 ],
            [ 'appIcon80', 80 ]
        ]
    }
});

mios.icons.push({
    name: 'Cydia',
    bundle_id: 'com.saurik.Cydia',
    app_id: 'Cydia.app',
    psd_id: false,
    icons: {
        icon: true,
        custom: [
            [ 'Icon-76@2x~ipad', 152 ],
            [ 'Icon-76~ipad', 76 ],
            [ 'Icon7-Small', 1234 ],
            [ 'Icon7-Small@2x', 1234 ],
            [ 'Icon7-Small@3x', 1234 ],
            [ 'icon-72', 72 ],
            [ 'icon-72@2x', 144 ],
            [ 'icon', 1234 ],
            [ 'icon@2x', 1234 ],
            [ 'iconClassic', 1234 ]
        ]
    }
});

mios.icons.push({
    name: 'Darkroom',
    bundle_id: 'co.bergen.Darkroom',
    app_id: 'Darkroom.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Day One',
    bundle_id: 'com.dayonelog.dayoneiphone',
    app_id: 'DayOne.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Deezer',
    bundle_id: 'com.deezer.Deezer',
    app_id: 'Deezer.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Deliveries',
    bundle_id: 'com.junecloud.Deliveries',
    app_id: 'Deliveries.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Discover Mobile',
    bundle_id: 'com.discoverfinancial.mobile',
    app_id: 'DiscoverMobile.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Discovery Channel',
    bundle_id: 'com.discovery.dscipadbottle',
    app_id: 'Discovery.app',
    psd_id: false,
    icons: {
        icon: true,
        custom: [
            [ 'Icon-120', 120 ],
            [ 'Icon-152', 152 ]
        ]
    }
});

mios.icons.push({
    name: 'Does not Commute',
    bundle_id: 'com.mediocre.commute',
    app_id: 'commute.app',
    psd_id: false,
    icons: {
        icon: true,
        custom: [
            [ 'Icon-38@2x', 76 ]
        ]
    }
});

mios.icons.push({
    name: 'Dropbox',
    bundle_id: 'com.getdropbox.Dropbox',
    app_id: 'Dropbox.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'icon-29', 29 ],
            [ 'icon-29@2x', 58 ],
            [ 'icon-29@3x', 87 ],
            [ 'icon-40', 40 ],
            [ 'icon-40@2x', 80 ],
            [ 'icon-40@3x', 120 ],
            [ 'icon-60@2x', 120 ],
            [ 'icon-60@3x', 180 ],
            [ 'icon-76', 76 ],
            [ 'icon-76@2x', 152 ]
        ]
    }
});

mios.icons.push({
    name: 'Dropbox Carousel',
    bundle_id: 'com.getdropbox.Carousel',
    app_id: 'Carousel.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Dubsmash',
    bundle_id: 'com.mobilemotion.dubsmash',
    app_id: 'Dubsmash.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Duolingo',
    bundle_id: 'com.duolingo.DuolingoMobile',
    app_id: 'DuolingoMobile.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Ebay',
    bundle_id: 'com.ebay.iphone',
    app_id: 'eBay.app',
    psd_id: false,
    icons: {
        icon: true,
        custom: [
            [ 'icon_57x57', 57 ],
            [ 'icon_114x114', 114 ]
        ]
    }
});

mios.icons.push({
    name: 'Ebay iPad',
    bundle_id: 'com.ebay.core.ipad',
    app_id: 'eBay.app',
    psd_id: false,
    icons: {
        icon: true,
        custom: [
            [ 'icon_57x57', 57 ],
            [ 'icon_114x114', 114 ]
        ]
    }
});

mios.icons.push({
    name: 'Endomondo',
    bundle_id: 'com.endomondo.Endomondo',
    app_id: 'Endomondo.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'Icon', 60 ],
            [ 'Icon@2x', 120 ],
            [ 'Icon64', 64 ],
            [ 'Icon64@2x', 128 ],
            [ 'Icon-29', 29 ],
            [ 'Icon-57', 57 ],
            [ 'Icon-58', 58 ],
            [ 'Icon-80', 80 ],
            [ 'Icon-87', 87 ],
            [ 'Icon-114', 114 ],
            [ 'Icon-120', 120 ],
            [ 'Icon-180', 180 ]
        ]
    }
});

mios.icons.push({
    name: 'Epocrates',
    bundle_id: 'com.Epocrates.Rx',
    app_id: 'Essentials.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'ESPN ScoreCenter',
    bundle_id: 'com.espn.ScoreCenter',
    app_id: 'SportsCenter.app',
    psd_id: false,
    icons: {
        appicon: true,
        icon: true
    }
});

mios.icons.push({
    name: 'ESPN Watch',
    bundle_id: 'com.espn.WatchESPN',
    app_id: 'WatchESPN.app ',
    psd_id: false,
    icons: {
        icon: true,
        custom: [
            [ 'Icon@2x~ipad', 120 ],
            [ 'Icon~ipad', 60 ],
            [ 'Icon~iphone', 60 ]
        ]
    }
});

mios.icons.push({
    name: 'Etsy',
    bundle_id: 'com.etsy.etsyforios',
    app_id: 'Etsy.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'BOEAppIcon29x29@2x', 58 ],
            [ 'BOEAppIcon29x29@2x~ipad', 58 ],
            [ 'BOEAppIcon29x29@3x', 87 ],
            [ 'BOEAppIcon29x29~ipad', 29 ],
            [ 'BOEAppIcon40x40@2x', 80 ],
            [ 'BOEAppIcon40x40@2x~ipad', 80 ],
            [ 'BOEAppIcon40x40@3x', 120 ],
            [ 'BOEAppIcon40x40~ipad', 40 ],
            [ 'BOEAppIcon60x60@2x', 120 ],
            [ 'BOEAppIcon60x60@3x', 180 ],
            [ 'BOEAppIcon76x76@2x~ipad', 152 ],
            [ 'BOEAppIcon76x76~ipad', 76 ]
        ]
    }
});

mios.icons.push({
    name: 'Eventbrite',
    bundle_id: 'com.eventbrite.attendee',
    app_id: 'Eventbrite.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Evernote iPhone',
    bundle_id: 'com.evernote.iPhone.Evernote',
    app_id: 'Evernote.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'f.lux',
    bundle_id: 'org.herf.iflux',
    app_id: 'iflux.app',
    psd_id: false,
    icons: {
        icon: true
    }
});

mios.icons.push({
    name: 'Fab',
    bundle_id: 'com.fab.version1',
    app_id: 'Fab.app',
    psd_id: false,
    icons: {
        appicon: true,
        custom: [
            [ 'icon', 57 ],
            [ 'FabIcon(29px)-1', 29 ],
            [ 'FabIcon(29px)', 29 ],
            [ 'FabIcon(40px)', 40 ],
            [ 'FabIcon(50px)', 50 ],
            [ 'FabIcon(57px)', 57 ],
            [ 'FabIcon(58px)-1', 58 ],
            [ 'FabIcon(58px)', 58 ],
            [ 'FabIcon(72px)', 72 ],
            [ 'FabIcon(76px)', 76 ],
            [ 'FabIcon(80px)-1', 80 ],
            [ 'FabIcon(80px)', 80 ],
            [ 'FabIcon(100px)', 100 ],
            [ 'FabIcon(114px)', 114 ],
            [ 'FabIcon(120px)', 120 ],
            [ 'FabIcon(144px)', 144 ],
            [ 'FabIcon(152px)', 152 ]
        ]
    }
});

mios.icons.push({
    name: 'Facebook',
    bundle_id: 'com.facebook.Facebook',
    app_id: 'Facebook.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'Icon-Production', 57 ],
            [ 'Icon-Production@2x', 114 ],
            [ 'Icon-Production-40', 40 ],
            [ 'Icon-Production-40@2x', 80 ],
            [ 'Icon-Production-72', 72 ],
            [ 'Icon-Production-72@2x', 144 ],
            [ 'Icon-Production-76', 76 ],
            [ 'Icon-Production-76@2x', 152 ],
            [ 'Icon-Production-120', 120 ],
            [ 'Icon-Production-180', 180 ],
            [ 'Icon-Production-Small-50', 50 ],
            [ 'Icon-Production-Small-50@2x', 100 ],
            [ 'Icon-Production-Small', 29 ],
            [ 'Icon-Production-Small@2x', 58 ]
        ]
    }
});

mios.icons.push({
    name: 'Facebook Groups',
    bundle_id: 'com.facebook.Groups',
    app_id: 'Groups.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'Icon-29@3x', 87 ],
            [ 'Icon-40@2x-1', 80 ],
            [ 'Icon-40@2x', 80 ],
            [ 'Icon-Small@2x', 58 ],
            [ 'Icon@2x', 120 ],
            [ 'Icon@3x', 180 ]
        ]
    }
});

mios.icons.push({
    name: 'Facebook Messenger',
    bundle_id: 'com.facebook.Messenger',
    app_id: 'Messenger.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'Icon-Production', 57 ],
            [ 'Icon-Production@2x', 114 ],
            [ 'Icon-Production-40', 40 ],
            [ 'Icon-Production-40@2x', 80 ],
            [ 'Icon-Production-72', 72 ],
            [ 'Icon-Production-72@2x', 144 ],
            [ 'Icon-Production-76', 76 ],
            [ 'Icon-Production-76@2x', 152 ],
            [ 'Icon-Production-120', 120 ],
            [ 'Icon-Production-180', 180 ],
            [ 'Icon-Production-Small-50', 50 ],
            [ 'Icon-Production-Small-50@2x', 100 ],
            [ 'Icon-Production-Small', 29 ],
            [ 'Icon-Production-Small@2x', 58 ]
        ]
    }
});

mios.icons.push({
    name: 'Facebook Paper',
    bundle_id: 'com.facebook.Paper',
    app_id: 'Paper.app',
    psd_id: false,
    icons: {
        folder: '/CajmereResources/Icons/blue',
        icon: true,
        custom: [
            [ 'Icon-29', 29 ],
            [ 'Icon-29@2x', 58 ]
        ]
    }
});

mios.icons.push({
    name: 'FaceTune',
    bundle_id: 'com.lightricks.Facetune',
    app_id: 'Facetune.app',
    psd_id: false,
    icons: {
        icon: true,
        custom: [
            [ 'Icon-120@2x', 120 ],
            [ 'Icon-120@3x', 180 ],
            [ 'Icon-Small-58@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Fandango',
    bundle_id: 'com.fandango.fandango',
    app_id: 'Fandango.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'FanDuel',
    bundle_id: 'com.fanduel.fd',
    app_id: 'FanDuel.app ',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Fantastical',
    bundle_id: 'com.flexibits.fantastical2.iphone',
    app_id: false,
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'FCC',
    bundle_id: 'com.samknows.fcc',
    app_id: 'FCC.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'Icon_FCC_29', 29 ],
            [ 'Icon_FCC_40', 40 ],
            [ 'Icon_FCC_58', 58 ],
            [ 'Icon_FCC_60', 60 ],
            [ 'Icon_FCC_76', 76 ],
            [ 'Icon_FCC_80', 80 ],
            [ 'Icon_FCC_120', 120 ],
            [ 'Icon_FCC_152', 152 ]
        ]
    }
});

mios.icons.push({
    name: 'Feedly',
    bundle_id: 'com.devhd.feedly',
    app_id: 'feedly.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Fitbit',
    bundle_id: 'com.fitbit.FitbitMobile',
    app_id: 'FitbitMobile.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Five Guys',
    bundle_id: 'com.fiveguys.mobile',
    app_id: 'Five Guys.app ',
    psd_id: false,
    icons: {
        icon: true,
        custom: [
            [ 'appicon', 60 ],
            [ 'appicon@2x', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'Fiverr Faces',
    bundle_id: 'com.fiverr.FiverrCartoon',
    app_id: 'FiverrCartoon.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Flappy Bird',
    bundle_id: 'com.dotgears.flap',
    app_id: 'Flap.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Flickr',
    bundle_id: 'com.yahoo.flickr',
    app_id: 'com.yahoo.flickr-4574-distribution.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Fling',
    bundle_id: 'com.unii.fling',
    app_id: 'fling.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Flipagram',
    bundle_id: 'com.flipagram.flipagram',
    app_id: 'Flipagram.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Flipboard',
    bundle_id: 'com.flipboard.flipboard-ipad',
    app_id: 'Flipboard.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Flixster',
    bundle_id: 'com.jeffreygrossman.moviesapp',
    app_id: 'Flixster.app',
    psd_id: false,
    icons: {
        icon: true,
        custom: [
            [ 'AppIcons29x29',          29 ],
            [ 'AppIcons29x29~ipad',     29 ],
            [ 'AppIcons29x29@2x',       58 ],
            [ 'AppIcons29x29@2x~ipad',  58 ],
            [ 'AppIcons29x29@3x',       87 ],
            [ 'AppIcons29x29@3x~ipad',  87 ],

            [ 'AppIcons40x40',          40 ],
            [ 'AppIcons40x40~ipad',     40 ],
            [ 'AppIcons40x40@2x',       80 ],
            [ 'AppIcons40x40@2x~ipad',  80 ],
            [ 'AppIcons40x40@3x',       120 ],
            [ 'AppIcons40x40@3x~ipad',  120 ],

            [ 'AppIcons50x50',          50 ],
            [ 'AppIcons50x50@2x',       100 ],

            [ 'AppIcons57x57',          57 ],
            [ 'AppIcons57x57@2x',       114 ],

            [ 'AppIcons60x60',          60 ],
            [ 'AppIcons60x60@2x',       120 ],
            [ 'AppIcons60x60@3x',       180 ],

            [ 'AppIcons72x72',          72 ],
            [ 'AppIcons72x72~ipad',     72 ],
            [ 'AppIcons72x72@2x',       144 ],
            [ 'AppIcons72x72@2x~ipad',  144 ],

            [ 'AppIcons76x76',          76 ],
            [ 'AppIcons76x76~ipad',     76 ],
            [ 'AppIcons76x76@2x',       152 ],
            [ 'AppIcons76x76@2x~ipad',  152 ],

            [ 'AppIcons120x120',        120 ],

            [ 'Icon-120', 120 ],
            [ 'Icon-152', 152 ]
        ]
    }
});

mios.icons.push({
    name: 'FontBook',
    bundle_id: 'com.fontshop.FontBook',
    app_id: 'FontBook.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Four Four Two Stats Zone',
    bundle_id: 'com.fourfourtwo.statszone',
    app_id: 'StatsZone.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Foxtel Go',
    bundle_id: 'au.com.foxtel.FoxtelGoiPhone',
    app_id: 'foxtelgoiPhone.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'AppIcons57x57', 57 ],
            [ 'AppIcons57x57@2x', 114 ],
            [ 'AppIcons60x60', 60 ],
            [ 'AppIcons60x60@2x', 120 ],
            [ 'AppIcons60x60@3x', 180 ],
            [ 'AppIcons72x72~ipad', 72 ],
            [ 'AppIcons72x72@2x~ipad', 144 ],
            [ 'AppIcons76x76~ipad', 76 ],
            [ 'AppIcons76x76@2x~ipad', 152 ]
        ]
    }
});

mios.icons.push({
    name: 'Foxtel Guide',
    bundle_id: 'au.com.foxtel.guide',
    app_id: 'Foxtel Guide.app',
    psd_id: false,
    icons: {
        icon: true,
        custom: [
            [ 'Icon-120', 120 ],
            [ 'Icon-152', 152 ]
        ]
    }
});

mios.icons.push({
    name: 'Funny or Die',
    bundle_id: 'com.funnyordie.FunnyOrDie',
    app_id: 'FunnyOrDie.app',
    psd_id: false,
    icons: {
        icon: true,
        custom: [
            [ 'Icon-Spotlight-40', 40 ],
            [ 'Icon-Spotlight-40@2x', 80 ]
        ]
    }
});

mios.icons.push({
    name: 'Funny or Die News Flash',
    bundle_id: 'com.funnyordie.newsflash',
    app_id: 'gnn.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Gate Guru',
    bundle_id: 'com.mobilityapps.gategurufull',
    app_id: 'GateGuru.app ',
    psd_id: false,
    icons: {
        icon: true
    }
});

mios.icons.push({
    name: 'GEICO Mobile',
    bundle_id: 'com.geico.GloveBox',
    app_id: 'GEICO.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Genius Scan - PDF Scanner',
    bundle_id: 'com.geniussoftware.GeniusScan',
    app_id: 'Genius Scan.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Giphy for Messenger',
    bundle_id: 'com.giphy.giphyformessenger',
    app_id: 'Giphy.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Google Analytics',
    bundle_id: 'com.google.AnalyticsApp',
    app_id: 'Giant.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'Icon29x29', 29 ],
            [ 'Icon57x57', 57 ],
            [ 'Icon58x58', 58 ],
            [ 'Icon80x80', 80 ],
            [ 'Icon114x114', 114 ],
            [ 'Icon120x120', 120 ],
            [ 'icon-40', 40 ],
            [ 'icon-72', 72 ],
            [ 'icon-76', 76 ],
            [ 'icon-144', 144 ],
            [ 'icon-152', 152 ]
        ]
    }
});

mios.icons.push({
    name: 'Google Authenticator',
    bundle_id: 'com.google.Authenticator',
    app_id: 'Authenticator.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Google Calendar',
    bundle_id: 'com.google.calendar',
    app_id: 'Google Calendar.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Google Chrome',
    bundle_id: 'com.google.chrome.ios',
    app_id: 'stable.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'Icon-29', 29 ],
            [ 'Icon-40', 40 ],
            [ 'Icon-58', 58 ],
            [ 'Icon-76', 76 ],
            [ 'Icon-80', 80 ],
            [ 'Icon-87', 87 ],
            [ 'Icon-120', 120 ],
            [ 'Icon-152', 152 ],
            [ 'Icon-180', 180 ]
        ]
    }
});

mios.icons.push({
    name: 'Google Chromecast',
    bundle_id: 'com.google.Chromecast',
    app_id: 'Chromecast.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Google Docs',
    bundle_id: 'com.google.Docs',
    app_id: 'Docs.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Google Drive',
    bundle_id: 'com.google.Drive',
    app_id: 'Drive.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Google Earth',
    bundle_id: 'com.google.b612',
    app_id: 'Google Earth.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'icon-ipad', 72 ],
            [ 'icon-ipad@2x', 144 ],
            [ 'icon', 60 ],
            [ 'icon@2x', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'Google Gmail',
    bundle_id: 'com.google.Gmail',
    app_id: 'GmailHybrid.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Google Hangouts',
    bundle_id: 'com.google.hangouts',
    app_id: 'Hangouts.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Google Inbox',
    bundle_id: 'com.google.inbox',
    app_id: 'Inbox.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'Bigtop-AppIcon29x29~ipad',     29 ],
            [ 'Bigtop-AppIcon29x29@2x',       58 ],
            [ 'Bigtop-AppIcon29x29@2x~ipad',  58 ],
            [ 'Bigtop-AppIcon29x29@3x',       87 ],

            [ 'Bigtop-AppIcon40x40~ipad',     40 ],
            [ 'Bigtop-AppIcon40x40@2x',       80 ],
            [ 'Bigtop-AppIcon40x40@2x~ipad',  80 ],
            [ 'Bigtop-AppIcon40x40@3x',       120 ],

            [ 'Bigtop-AppIcon60x60@2x',       120 ],
            [ 'Bigtop-AppIcon60x60@3x',       180 ],

            [ 'Bigtop-AppIcon76x76~ipad',     76 ],
            [ 'Bigtop-AppIcon76x76@2x~ipad',  152 ]
        ]
    }
});

mios.icons.push({
    name: 'Google Local',
    bundle_id: 'com.google.Local',
    app_id: 'Local.app',
    psd_id: false,
    icons: {
        icon: true
    }
});

mios.icons.push({
    name: 'Google Maps',
    bundle_id: 'com.google.Maps',
    app_id: 'Google Maps.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'AppIcon', 60 ],
            [ 'AppIcon@2x', 120 ],
            [ 'AppIcon-60@2x', 120 ],
            [ 'AppIcon-60@3x', 180 ],
            [ 'AppIcon-72', 72 ],
            [ 'AppIcon-72@2x', 144 ],
            [ 'AppIcon-76', 76 ],
            [ 'AppIcon-76@2x', 152 ],
            [ 'AppIcon-Small-40', 40 ],
            [ 'AppIcon-Small-40@2x', 80 ],
            [ 'AppIcon-Small-40@3x', 120 ],
            [ 'AppIcon-Small-50', 50 ],
            [ 'AppIcon-Small-50@2x', 100 ],
            [ 'AppIcon-Small', 29 ],
            [ 'AppIcon-Small@2x', 58 ],
            [ 'AppIcon-Small@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Google Mobile',
    bundle_id: 'com.google.GoogleMobile',
    app_id: 'Google.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Google News',
    bundle_id: 'com.google.news',
    app_id: 'News.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Google Play Movies',
    bundle_id: 'com.google.Movies',
    app_id: 'Movies.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Google Plus',
    bundle_id: 'com.google.GooglePlus',
    app_id: 'EmSea.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'icon-29', 29 ],
            [ 'icon-29@2x', 58 ],
            [ 'icon-40', 40 ],
            [ 'icon-40@2x', 80 ],
            [ 'icon-50', 50 ],
            [ 'icon-50@2x', 100 ],
            [ 'icon-57', 57 ],
            [ 'icon-57@2x', 114 ],
            [ 'icon-60@2x', 120 ],
            [ 'icon-60@3x', 180 ],
            [ 'icon-72', 72 ],
            [ 'icon-72@2x', 144 ],
            [ 'icon-76', 76 ],
            [ 'icon-76@2x', 156 ]
        ]
    }
});

mios.icons.push({
    name: 'Google Sheets',
    bundle_id: 'com.google.Sheets',
    app_id: 'Sheets.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Google Slides',
    bundle_id: 'com.google.Slides',
    app_id: 'Slides.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Google Snapseed',
    bundle_id: 'com.niksoftware.snapseedforipad',
    app_id: 'Snapseed.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Google Translate',
    bundle_id: 'com.google.Translate',
    app_id: 'Translate.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Google Wallet',
    bundle_id: 'com.google.Wallet',
    app_id: 'Wallet.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'wallet_app_icon', 76 ],
            [ 'wallet_app_icon@2x', 120 ],
            [ 'wallet_app_icon@3x', 180 ],
            [ 'wallet_app_icon_settings', 29 ],
            [ 'wallet_app_icon_settings@2x', 58 ],
            [ 'wallet_app_icon_settings@3x', 87 ],
            [ 'wallet_app_icon_spotlight', 40 ],
            [ 'wallet_app_icon_spotlight@2x', 80 ],
            [ 'wallet_app_icon_spotlight@3x', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'Google Youtube',
    bundle_id: 'com.google.ios.youtube',
    app_id: 'YouTube.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'Icon', 60 ],
            [ 'Icon_2x', 120 ],
            [ 'Icon-72', 72 ],
            [ 'Icon-72_2x', 144 ],
            [ 'Icon-Small-50', 50 ],
            [ 'Icon-Small-50_2x', 100 ],
            [ 'Icon-ios7-29', 29 ],
            [ 'Icon-ios7-40', 40 ],
            [ 'Icon-ios7-58', 58 ],
            [ 'Icon-ios7-76', 76 ],
            [ 'Icon-ios7-80', 80 ],
            [ 'Icon-ios7-120', 120 ],
            [ 'Icon-ios7-152', 152 ]
        ]
    }
});

mios.icons.push({
    name: 'Google Youtube Creator Studio',
    bundle_id: 'com.google.ios.ytcreator',
    app_id: 'CreatorStudio.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'Icon-ios6-57', 57 ],
            [ 'Icon-ios7-29', 29 ],
            [ 'Icon-ios7-40', 40 ],
            [ 'Icon-ios7-58', 58 ],
            [ 'Icon-ios7-60', 60 ],
            [ 'Icon-ios7-76', 76 ],
            [ 'Icon-ios7-80', 80 ],
            [ 'Icon-ios7-120', 120 ],
            [ 'Icon-ios7-152', 152 ]
        ]
    }
});

mios.icons.push({
    name: 'GroupMe',
    bundle_id: 'com.groupme.iphone-app',
    app_id: 'GroupMe.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Groupon',
    bundle_id: 'com.groupon.grouponapp',
    app_id: 'Groupon.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Guitar Tuna',
    bundle_id: 'com.ovelin.guitartuna',
    app_id: 'guitartuna.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Hanging With Friends Paid',
    bundle_id: 'com.zynga.HangingWithFriendsPaid',
    app_id: 'HangingWithFriendsPaid.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'HBO Go',
    bundle_id: 'com.hbo.hbogo',
    app_id: 'HBOGO.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'hbogo_icon_29x29', 29 ],
            [ 'hbogo_icon_40x40', 40 ],
            [ 'hbogo_icon_50x50', 50 ],
            [ 'hbogo_icon_57x57', 57 ],
            [ 'hbogo_icon_58x58', 58 ],
            [ 'hbogo_icon_72x72', 72 ],
            [ 'hbogo_icon_76x76', 76 ],
            [ 'hbogo_icon_80x80', 80 ],
            [ 'hbogo_icon_100x100', 100 ],
            [ 'hbogo_icon_114x114', 114 ],
            [ 'hbogo_icon_120x120', 120 ],
            [ 'hbogo_icon_144x144', 144 ],
            [ 'hbogo_icon_152x152', 152 ]
        ]
    }
});

mios.icons.push({
    name: 'HBO Now',
    bundle_id: 'com.hbo.hbonow',
    app_id: 'HBO.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'HeyHey',
    bundle_id: 'cl.heyheyapp.HeyHey',
    app_id: 'HeyHey.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Holy Bible',
    bundle_id: 'tv.lifechurch.bible',
    app_id: 'Bible.app',
    psd_id: false,
    icons: {
        appicon: true,
        icon: true
    }
});

mios.icons.push({
    name: 'HopStop',
    bundle_id: 'com.hopstop.HopStop',
    app_id: 'HopStop.app',
    psd_id: false,
    icons: {
        icon: true
    }
});

mios.icons.push({
    name: 'Hot Or Not',
    bundle_id: 'com.badoo.hotornot',
    app_id: 'HotOrNot.app',
    psd_id: false,
    icons: {
        appicon: true,
        custom: [
            [ 'IconHON_29', 29 ],
            [ 'IconHON_40', 40 ],
            [ 'IconHON_50', 50 ],
            [ 'IconHON_57', 57 ],
            [ 'IconHON_58', 58 ],
            [ 'IconHON_72', 72 ],
            [ 'IconHON_76', 76 ],
            [ 'IconHON_80', 80 ],
            [ 'IconHON_100', 100 ],
            [ 'IconHON_114', 114 ],
            [ 'IconHON_120', 120 ],
            [ 'IconHON_144', 144 ],
            [ 'IconHON_152', 152 ]
        ]
    }
});

mios.icons.push({
    name: 'Hulu',
    bundle_id: 'com.hulu.plus',
    app_id: 'Hulu.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Human',
    bundle_id: 'co.humanco.Human',
    app_id: 'Human.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Huntington',
    bundle_id: 'com.huntington.m',
    app_id: 'Huntington.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'icon', 60 ],
            [ 'icon@2x', 120 ],
            [ 'icon-60@2x', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'Hyperlapse',
    bundle_id: 'com.burbn.hyperlapse',
    app_id: 'Hyperlapse.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'iAlien',
    bundle_id: 'com.appseedinc.aliens',
    app_id: 'iAlien.app ',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Ibotta',
    bundle_id: 'com.ibotta.Ibotta',
    app_id: 'Ibotta.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'iCleaner',
    bundle_id: 'org.altervista.exilecom.icleaner',
    app_id: 'iCleaner.app',
    psd_id: false,
    icons: {
        icon: true
    }
});

mios.icons.push({
    name: 'iCleaner iPhone 6 Plus',
    bundle_id: 'com.exile90.icleanerpro',
    app_id: 'iCleaner.app',
    psd_id: false,
    icons: {
        icon: true
    }
});

mios.icons.push({
    name: 'IF',
    bundle_id: 'com.ifttt.ifttt',
    app_id: 'IFTTT.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'iFile',
    bundle_id: 'eu.heinelt.ifile',
    app_id: 'iFile.app',
    psd_id: false,
    icons: {
        appicon: true,
        icon: true
    }
});

mios.icons.push({
    name: 'iFunny',
    bundle_id: 'ru.flysoft.ifunny',
    app_id: 'iFunny.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'iHeartRadio',
    bundle_id: 'com.clearchannel.iheartradio',
    app_id: 'iHeartRadio.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'iLEX R.A.T.',
    bundle_id: 'com.lex.ilexrestore',
    app_id: 'iLexRestore.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'Icon', 60 ],
            [ 'Icon@2x', 120 ],
            [ 'Icon@2x144', 152 ]
        ]
    }
});

mios.icons.push({
    name: 'IMDB',
    bundle_id: 'com.imdb.imdb',
    app_id: 'IMDb.app',
    psd_id: false,
    icons: {
        appicon: true,
        custom: [
            [ 'Icon@2x', 114 ],
            [ 'Icon-Small@2x', 58 ],
            [ 'Icon-iPad@2x', 144 ]
        ]
    }
});

mios.icons.push({
    name: 'Imgur',
    bundle_id: 'imgurmobile',
    app_id: 'Imgur.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Imgur Browsr',
    bundle_id: 'hr.limun-studio.imgur-browser',
    app_id: 'imgur browser.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'imo',
    bundle_id: 'imoimiphone',
    app_id: 'imo.app',
    psd_id: false,
    icons: {
        icon: true
    }
});

mios.icons.push({
    name: 'Inbox Messenger',
    bundle_id: 'co.inboxapp.inbox',
    app_id: 'Inbox.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Indeed Jobs',
    bundle_id: 'com.indeed.JobSearch',
    app_id: 'Indeed Jobs.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Instacast',
    bundle_id: 'com.vemedio.ios.instacast3',
    app_id: 'Instacast.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'InstaCollage Free',
    bundle_id: 'com.click2mobile.collagegrameFree',
    app_id: 'instaCollageFree.app',
    psd_id: false,
    icons: {
        custom: [
            [ '114', 114 ],
            [ '120', 120 ],
            [ '144', 144 ],
            [ '152', 152 ],
            [ '156', 156 ],
            [ '57', 57 ],
            [ '72', 72 ],
            [ '76', 76 ]
        ]
    }
});

mios.icons.push({
    name: 'Instagram',
    bundle_id: 'com.burbn.instagram',
    app_id: 'Instagram.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'Icon-57', 57 ],
            [ 'Icon-57@2x', 114 ],
            [ 'Icon-57@3x', 171 ],
            [ 'Icon-60@2x', 120 ],
            [ 'Icon-60@3x', 180 ]
        ]
    }
});

mios.icons.push({
    name: 'InstaSize',
    bundle_id: 'InstaSize',
    app_id: 'InstaSize.app',
    psd_id: false,
    icons: {
        appicon: true,
        custom: [
            [ 'InstaSize_App_Icon', 60 ],
            [ 'InstaSize_App_Icon@2x', 120 ],
            [ 'InstaSize_App_Icon_120', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'iTube',
    bundle_id: 'soundcloudbennyfree',
    app_id: 'iTube.app',
    psd_id: false,
    icons: {
        icon: true
    }
});

mios.icons.push({
    name: 'Journalized',
    bundle_id: 'com.andrewhart.journal',
    app_id: 'Journalized.app ',
    psd_id: false,
    icons: {
        icon: true
    }
});

mios.icons.push({
    name: 'KakaoTalk',
    bundle_id: 'com.iwilab.KakaoTalk',
    app_id: 'KakaoTalk.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Keeper',
    bundle_id: 'D4D2433BGC',
    app_id: 'Keeper.app',
    psd_id: false,
    icons: {
        appicon: true,
        custom: [
            [ 'icon_29', 29 ],
            [ 'icon_40', 40 ],
            [ 'icon_58', 58 ],
            [ 'icon_76', 76 ],
            [ 'icon_80', 80 ],
            [ 'icon_87', 87 ],
            [ 'icon_120', 120 ],
            [ 'icon_152', 152 ],
            [ 'icon_180', 180 ]
        ]
    }
});

mios.icons.push({
    name: 'kik',
    bundle_id: 'com.kik.chat',
    app_id: 'Kik.app',
    psd_id: false,
    icons: {
        custom: [
            [ '29x29_Icon', 29 ],
            [ '29x29_Icon@2x', 58 ],
            [ '57x57_Icon', 57 ],
            [ '57x57_Icon@2x', 114 ],
            [ '60x60_Icon', 60 ],
            [ '60x60_Icon@2x', 120 ],
            [ '60x60_Icon@3x', 180 ],
            [ '80x80_Icon', 80 ],
            [ '120x120_Icon', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'Kindle',
    bundle_id: 'com.amazon.Lassen',
    app_id: 'Kindle.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'LastPass',
    bundle_id: 'com.lastpass.ilastpass',
    app_id: 'LastPass.app',
    psd_id: false,
    icons: {
        appicon: true,
        custom: [
            [ 'lastpassicon', 60 ],
            [ 'lastpassicon@2x', 120 ],
            [ 'lastpassicon72', 72 ],
            [ 'lastpassicon72@2x', 144 ],
            [ 'lastpassicon76', 76 ],
            [ 'lastpassicon120', 120 ],
            [ 'lastpassicon152', 152 ]
        ]
    }
});

mios.icons.push({
    name: 'Launch Center Pro',
    bundle_id: 'com.appcubby.launchpro',
    app_id: 'Launch.app',
    psd_id: false,
    icons: {
        appicon: true,
        custom: [
            [ 'AppIcon58', 58 ],
            [ 'AppIcon80', 80 ],
            [ 'AppIcon120', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'LINE',
    bundle_id: 'jp.naver.line',
    app_id: 'LINE.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'LinkedIn',
    bundle_id: 'com.linkedin.LinkedIn',
    app_id: 'LinkedIn.app',
    psd_id: false,
    icons: {
        appicon: true,
        custom: [
            [ 'LinkedIn-57x57', 57 ]
        ]
    }
});

mios.icons.push({
    name: 'LogMeIn',
    bundle_id: 'com.logmein.logmein',
    app_id: 'LogMeIn.app ',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'LoseIt',
    bundle_id: 'com.fitnow.loseit',
    app_id: 'Lose It!.app',
    psd_id: false,
    icons: {
        appicon: true,
        icon: true,
        custom: [
            [ 'Icon-29', 29 ],
            [ 'Icon-29@2x', 58 ],
            [ 'Icon-50', 50 ],
            [ 'Icon-152', 152 ]
        ]
    }
});

mios.icons.push({
    name: 'Lyft',
    bundle_id: 'com.zimride.instant',
    app_id: 'lyft.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Mailbox',
    bundle_id: 'com.orchestra.v2',
    app_id: 'Mailbox.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Make It Big',
    bundle_id: 'com.atrinh.makeitbig',
    app_id: 'makeitbig.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Manga Rock',
    bundle_id: 'com.notabasement.mr2',
    app_id: 'Manga Rock.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Mashable',
    bundle_id: 'com.mashable.ios.phoenix',
    app_id: 'Mashable.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Match.com',
    bundle_id: 'com.match.match.com',
    app_id: 'Match.com.app ',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Maybank',
    bundle_id: 'my.com.maybank2u.mobile',
    app_id: false,
    psd_id: false,
    icons: {
        icon: true,
        custom: [
            [ 'Icon-29', 29 ],
            [ 'Icon-29@2x', 58 ],
            [ 'Icon-29@3x', 87 ],
            [ 'Icon-50', 50 ],
            [ 'Icon-50@2x', 100 ],
            [ 'Icon-50@3x', 150 ],
            [ 'Icon-57', 57 ],
            [ 'Icon-57@2x', 114 ],
            [ 'Icon-57@3x', 171 ],
            [ 'Icon-72@3x', 216 ],
            [ 'Icon-76@3x', 228 ],
            [ 'Icon-120', 120 ],
            [ 'Icon-120@2x', 240 ],
            [ 'Icon-120@3x', 360 ]
        ]
    }
});

mios.icons.push({
    name: 'Memoir',
    bundle_id: 'com.yourmemoir.memoir',
    app_id: 'Memoir.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'AppIcon Production29x29', 29 ],
            [ 'AppIcon Production29x29@2x', 58 ],
            [ 'AppIcon Production29x29@2x~ipad', 58 ],
            [ 'AppIcon Production29x29~ipad', 29 ],
            [ 'AppIcon Production40x40@2x', 80 ],
            [ 'AppIcon Production40x40@2x~ipad', 80 ],
            [ 'AppIcon Production40x40~ipad', 40 ],
            [ 'AppIcon Production50x50@2x~ipad', 100 ],
            [ 'AppIcon Production50x50~ipad', 50 ],
            [ 'AppIcon Production57x57', 57 ],
            [ 'AppIcon Production57x57@2x', 114 ],
            [ 'AppIcon Production60x60@2x', 120 ],
            [ 'AppIcon Production72x72@2x~ipad', 144 ],
            [ 'AppIcon Production72x72~ipad', 72 ],
            [ 'AppIcon Production76x76@2x~ipad', 152 ],
            [ 'AppIcon Production76x76~ipad', 76 ],
            [ 'icon29', 29 ],
            [ 'icon50', 50 ],
            [ 'icon57', 57 ],
            [ 'icon58', 58 ],
            [ 'icon72', 72 ],
            [ 'icon114', 114 ],
            [ 'icon120', 120 ],
            [ 'icon144', 144 ]
        ]
    }
});

mios.icons.push({
    name: 'Microsoft Excel',
    bundle_id: 'com.microsoft.Office.Excel',
    app_id: 'Microsoft Excel iOS.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Microsoft OneDrive',
    bundle_id: 'com.microsoft.skydrive',
    app_id: '1.app',
    psd_id: false,
    icons: {
        appicon: true,
        icon: true
    }
});

mios.icons.push({
    name: 'Microsoft Outlook',
    bundle_id: 'com.microsoft.Office.Outlook',
    app_id: 'app-ios.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'AppIcon-outlook.prod29x29', 29 ],
            [ 'AppIcon-outlook.prod29x29@2x', 58 ],
            [ 'AppIcon-outlook.prod29x29@2x~ipad', 58 ],
            [ 'AppIcon-outlook.prod29x29@3x', 87 ],
            [ 'AppIcon-outlook.prod29x29~ipad', 29 ],
            [ 'AppIcon-outlook.prod40x40@2x', 80 ],
            [ 'AppIcon-outlook.prod40x40@2x~ipad', 80 ],
            [ 'AppIcon-outlook.prod40x40@3x', 120 ],
            [ 'AppIcon-outlook.prod40x40~ipad', 40 ],
            [ 'AppIcon-outlook.prod50x50@2x~ipad', 100 ],
            [ 'AppIcon-outlook.prod50x50~ipad', 50 ],
            [ 'AppIcon-outlook.prod57x57', 57 ],
            [ 'AppIcon-outlook.prod57x57@2x', 114 ],
            [ 'AppIcon-outlook.prod60x60@2x', 120 ],
            [ 'AppIcon-outlook.prod60x60@3x', 180 ],
            [ 'AppIcon-outlook.prod72x72@2x~ipad', 144 ],
            [ 'AppIcon-outlook.prod72x72~ipad', 72 ],
            [ 'AppIcon-outlook.prod76x76@2x~ipad', 152 ],
            [ 'AppIcon-outlook.prod76x76~ipad', 76 ]
        ]
    }
});

mios.icons.push({
    name: 'Microsoft OWA',
    bundle_id: 'com.microsoft.exchange.iphone',
    app_id: 'MOWAHost-iPhone.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'AppIcon-iPhone29x29', 29 ],
            [ 'AppIcon-iPhone29x29@2x', 58 ],
            [ 'AppIcon-iPhone29x29@3x', 87 ],
            [ 'AppIcon-iPhone40x40@2x', 80 ],
            [ 'AppIcon-iPhone40x40@3x', 120 ],
            [ 'AppIcon-iPhone57x57', 57 ],
            [ 'AppIcon-iPhone57x57@2x', 114 ],
            [ 'AppIcon-iPhone60x60', 60 ],
            [ 'AppIcon-iPhone60x60@2x', 120 ],
            [ 'AppIcon-iPhone60x60@3x', 180 ]
        ]
    }
});

mios.icons.push({
    name: 'Microsoft Powerpoint',
    bundle_id: 'com.microsoft.Office.Powerpoint',
    app_id: 'Microsoft PowerPoint iOS.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Microsoft Smartglass',
    bundle_id: 'com.microsoft.smartglass',
    app_id: 'SmartGlass.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Microsoft Word',
    bundle_id: 'com.microsoft.Office.Word',
    app_id: 'Microsoft Word iOS.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Midori',
    bundle_id: 'com.sukolsak.Midori',
    app_id: false,
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Mint.com',
    bundle_id: 'com.mint.internal',
    app_id: 'Mint.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'MLB at Bat',
    bundle_id: 'com.mlb.AtBatUniversal',
    app_id: 'AtBat.Full.app',
    psd_id: false,
    icons: {
        icon: true
    }
});

mios.icons.push({
    name: 'Mobile Terminal',
    bundle_id: 'com.googlecode.mobileterminal.Terminal',
    app_id: 'Terminal.app',
    psd_id: false,
    icons: {
        icon: true
    }
});

mios.icons.push({
    name: 'Moby Dick, House of Kabob',
    bundle_id: 'com.mobysonline.mobydickhouseofkabob.ios',
    app_id: 'MobyDick.app ',
    psd_id: false,
    icons: {
        icon: true,
        custom: [
            [ 'Icon_ios7', 60 ],
            [ 'Icon_ios7@2x', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'Mortal Kombat',
    bundle_id: 'com.wb.MK.Brawler2015',
    app_id: 'UDKGame.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'Icon29', 29 ],
            [ 'Icon29@2x', 58 ],
            [ 'Icon40', 40 ],
            [ 'Icon40@2x', 80 ],
            [ 'Icon50', 100 ],
            [ 'Icon50@2x', 200 ],
            [ 'Icon57', 57 ],
            [ 'Icon57@2x', 114 ],
            [ 'Icon60', 60 ],
            [ 'Icon60@2x', 120 ],
            [ 'Icon72', 72 ],
            [ 'Icon72@2x', 144 ],
            [ 'Icon76', 76 ],
            [ 'Icon76@2x', 152 ]
        ]
    }
});

mios.icons.push({
    name: 'Moves',
    bundle_id: 'com.protogeo.Moves',
    app_id: 'Moves.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'moves-icon-ios6-iphone-small', 29 ],
            [ 'moves-icon-ios6-iphone', 60 ],
            [ 'moves-icon-ios6-iphone@2x', 120 ],
            [ 'moves-icon-ios7-iphone@2x', 180 ],
            [ 'moves-icon-ios7-settings@2x', 58 ],
            [ 'moves-icon-ios7-spotlight@2x', 80 ]
        ]
    }
});

mios.icons.push({
    name: 'Musicbox',
    bundle_id: 'com.freemake.musicbox',
    app_id: 'FreemakeMusicFinderDownloaderUIIOS.app',
    psd_id: false,
    icons: {
        icon: true
    }
});

mios.icons.push({
    name: 'My Mazda',
    bundle_id: 'com.ccas-ccg.MazdaAssist',
    app_id: 'AgeroRSA.app',
    psd_id: false,
    icons: {
        appicon: true,
        icon: true
    }
});

mios.icons.push({
    name: 'MyAT&T',
    bundle_id: 'com.att.osd.myWireless',
    app_id: 'myATTThin.app',
    psd_id: false,
    icons: {
        appicon: true,
        icon: true
    }
});

mios.icons.push({
    name: 'MyFitnessPal',
    bundle_id: 'com.myfitnesspal.mfp',
    app_id: 'MyFitnessPal.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'MyMaxis',
    bundle_id: 'com.Maxis.MyMaxis',
    app_id: false,
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'MyPantone',
    bundle_id: 'com.xrite.mypantone',
    app_id: 'myPANTONE.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'Icon', 60 ],
            [ 'myPANTONEicon-57px', 57 ],
            [ 'myPANTONEicon-114px', 114 ],
            [ 'myPANTONEicon-120px', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'MyScript Calculator',
    bundle_id: 'com.visionobjects.myscriptcalculator',
    app_id: 'MyScriptCalculator.app ',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'N_eye',
    bundle_id: 'com.n.eye.n.eye',
    app_id: 'N_eye.app',
    psd_id: false,
    icons: {
        custom: [
            [ '57', 57 ],
            [ '72', 72 ],
            [ '76', 76 ],
            [ '114', 114 ],
            [ '120', 120 ],
            [ '144', 144 ],
            [ '152', 152 ]
        ]
    }
});

mios.icons.push({
    name: 'Navy Federal Credit Union',
    bundle_id: 'org.navyfederal.nfcuforiphone',
    app_id: 'Navy Federal.app',
    psd_id: false,
    icons: {
        appicon: true,
        custom: [
            [ 'Icon', 60 ],
            [ 'Icon@2x', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'NBA',
    bundle_id: 'com.nbadigital.gametimelt',
    app_id: 'GameTimeUniversal.app',
    psd_id: false,
    icons: {
        appicon: true,
        icon: true,
        custom: [
            [ 'icon_57', 57 ],
            [ 'icon_60', 60 ],
            [ 'icon_72', 72 ],
            [ 'icon_76', 76 ],
            [ 'icon_114', 114 ],
            [ 'icon_120', 120 ],
            [ 'icon_144', 144 ],
            [ 'icon_152', 152 ]
        ]
    }
});

mios.icons.push({
    name: 'Netflix',
    bundle_id: 'com.netflix.Netflix',
    app_id: 'Netflix.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'New Words With Friends',
    bundle_id: 'com.newtoyinc.NewWordsWithFriendsFree',
    app_id: 'Words2.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Nexus Student Ministry',
    bundle_id: 'com.subsplashconsulting.Nexus-Student-Ministry',
    app_id: 'TCA.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'Icon', 60 ],
            [ 'Icon@2x', 120 ],
            [ 'Icon-60x60@2x', 120 ],
            [ 'Icon-60x60@3x', 180 ],
            [ 'Icon-72x72', 72 ],
            [ 'Icon-72x72@2x', 144 ],
            [ 'Icon-76x76', 76 ],
            [ 'Icon-76x76@2x', 152 ]
        ]
    }
});

mios.icons.push({
    name: 'NFL Fantasy Football',
    bundle_id: 'com.nfl.fantasy.core',
    app_id: 'NFL Fantasy.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'NFL Mobile',
    bundle_id: 'com.nfl.gamecenter',
    app_id: 'NFL Mobile USA Prod.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'NHL',
    bundle_id: 'com.nhl.gc1112.free',
    app_id: 'NHL1415.app',
    psd_id: false,
    icons: {
        appicon: true,
        custom: [
            [ 'Icon', 60 ],
            [ 'Icon@2x', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'Nike+',
    bundle_id: 'com.nike.nikeplus-gps',
    app_id: 'NikePlus.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Notability',
    bundle_id: 'com.gingerlabs.Notability',
    app_id: 'Notability.app',
    psd_id: false,
    icons: {
        appicon: true,
        custom: [
            [ 'notability-icon', 72 ],
            [ 'notability-icon@2x', 144 ],
            [ 'notability-icon@2x~iphone', 120 ],
            [ 'notability-icon~iphone', 60 ]
        ]
    }
});

mios.icons.push({
    name: 'OkCupid',
    bundle_id: 'com.okcupid.app',
    app_id: 'OkCupid.app ',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Ookla Speedtest',
    bundle_id: 'com.ookla.speedtest',
    app_id: 'SpeedTest.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'ooVoo',
    bundle_id: 'com.oovoo.iphone.free',
    app_id: 'ooVoo.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Open Table',
    bundle_id: 'com.contextoptional.OpenTable',
    app_id: 'OpenTable.app ',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'OpenVPN Connect',
    bundle_id: 'net.openvpn.connect.app',
    app_id: 'OpenVPN.app ',
    psd_id: false,
    icons: {
        custom: [
            [ 'Icon-100x100', 100 ],
            [ 'Icon-120x120', 120 ],
            [ 'Icon-144x144', 144 ],
            [ 'Icon-152x152', 152 ],
            [ 'Icon-40x40', 40 ],
            [ 'Icon-72', 72 ],
            [ 'Icon-76x76', 76 ],
            [ 'Icon-80x80', 80 ],
            [ 'Icon-Small-50', 50 ],
            [ 'Icon-Small-50@2x', 100 ],
            [ 'Icon-Small', 29 ],
            [ 'Icon-Small@2x', 58 ],
            [ 'Icon', 57 ],
            [ 'Icon@2x', 114 ],
            [ 'OpenVPN-Small', 29 ],
            [ 'OpenVPN-Small@2x', 58 ],
            [ 'OpenVPN', 57 ],
            [ 'OpenVPN@2x', 114 ]
        ]
    }
});

mios.icons.push({
    name: 'Overcast',
    bundle_id: 'fm.overcast.overcast',
    app_id: 'Overcast.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Pacemaker',
    bundle_id: 'com.pacemakermusic.pacemaker.001',
    app_id: 'Pacemaker.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'pma_icon_29x29', 29 ],
            [ 'pma_icon_40x40', 40 ],
            [ 'pma_icon_50x50', 50 ],
            [ 'pma_icon_58x58', 58 ],
            [ 'pma_icon_72x72', 72 ],
            [ 'pma_icon_76x76', 76 ],
            [ 'pma_icon_80x80', 80 ],
            [ 'pma_icon_100x100', 100 ],
            [ 'pma_icon_120x120', 120 ],
            [ 'pma_icon_144x144', 144 ],
            [ 'pma_icon_152x152', 152 ]
        ]
    }
});

mios.icons.push({
    name: 'Palringo',
    bundle_id: 'com.palringo.Palringo',
    app_id: 'Palringo.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Pandora',
    bundle_id: 'com.pandora',
    app_id: 'Pandora.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Pangu',
    bundle_id: 'io.pangu.loader',
    app_id: 'pangu.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Papa Johns',
    bundle_id: 'com.papajohns.ios',
    app_id: 'Papa John\'s.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Parcel',
    bundle_id: 'com.mr-brightside.myParcel',
    app_id: false,
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Paypal',
    bundle_id: 'com.yourcompany.PPClient',
    app_id: 'PayPal.app',
    psd_id: false,
    icons: {
        appicon: true,
        custom: [
            [ 'AppIcon_120', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'Pebble Smartwatch',
    bundle_id: 'com.getpebble.ios',
    app_id: 'PebbleApp.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Period Tracker (Sevenlogics)',
    bundle_id: 'com.sevenlogics.PeriodTracker',
    app_id: 'PeriodTracker.app',
    psd_id: false,
    icons: {
        appicon: true,
        icon: true
    }
});

mios.icons.push({
    name: 'Period Tracker Lite',
    bundle_id: 'com.gpapps.ptrackerlite',
    app_id: 'P Tracker Lite.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'Icon', 57 ],
            [ 'Icon@2x', 114 ],
            [ 'lite_icon', 57 ],
            [ 'lite_icon@2x', 114 ],
            [ 'lite_icon-120', 120 ],
            [ 'lite_icon-180', 180 ]
        ]
    }
});

mios.icons.push({
    name: 'Periscope',
    bundle_id: 'com.bountylabs.periscope',
    app_id: 'Periscope.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'PHHHOTO',
    bundle_id: 'com.hyperhyper.phhhoto-iphone',
    app_id: 'PHHHOTO-iPhone.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'PhotoMath',
    bundle_id: 'com.microblink.PhotoMath',
    app_id: 'PhotoMath.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Pic Collage',
    bundle_id: 'com.cardinalblue.PicCollage',
    app_id: 'Pic Collage.app',
    psd_id: false,
    icons: {
        icon: true,
        appicon: true,
        custom: [
            [ 'Icon-120', 120 ],
            [ 'Icon-152', 152 ],
            [ 'Icon@2x~ipad', 72 ],
            [ 'Icon~ipad', 144 ]
        ]
    }
});

mios.icons.push({
    name: 'Pic Jointer',
    bundle_id: 'com.lileping.photoframepro',
    app_id: 'PicFrame_ver_1.0.0.app',
    psd_id: false,
    icons: {
        appicon: true,
        custom: [
            [ 'icon-57', 57 ],
            [ 'icon-57@2x', 114 ],
            [ 'icon-60@2x', 120 ],
            [ 'icon-60@3x', 180 ],
            [ 'icon-72', 72 ],
            [ 'icon-72@2x', 144 ],
            [ 'icon-76', 76 ],
            [ 'icon-76@2x', 152 ]
        ]
    }
});

mios.icons.push({
    name: 'PicPlayPost',
    bundle_id: 'com.flambestudios.videoinframe',
    app_id: 'PicPlayPost.app',
    psd_id: false,
    icons: {
        icon: true,
        custom: [
            [ 'Icon-80', 80 ],
            [ 'Icon-120', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'Pics HD for Reddit',
    bundle_id: 'com.funpokesinc.redditpics',
    app_id: 'RedditPics.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'RedditPics29x29', 29 ],
            [ 'RedditPics29x29@2x', 58 ],
            [ 'RedditPics50x50@2x~ipad', 100 ],
            [ 'RedditPics50x50~ipad', 50 ],
            [ 'RedditPics57x57', 57 ],
            [ 'RedditPics57x57@2x', 114 ],
            [ 'RedditPics60x60@2x', 120 ],
            [ 'RedditPics72x72@2x~ipad', 144 ],
            [ 'RedditPics72x72~ipad', 72 ],
            [ 'RedditPics76x76@2x~ipad', 152 ],
            [ 'RedditPics76x76~ipad', 76 ]
        ]
    }
});

mios.icons.push({
    name: 'PicsArt',
    bundle_id: 'com.picsart.studio',
    app_id: 'PicsArt.app ',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Pinterest',
    bundle_id: 'pinterest',
    app_id: 'Pinterest.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Playstation',
    bundle_id: 'com.playstation.eu.playstationadhoc',
    app_id: 'PlayStationApp.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Plenty of Fish',
    bundle_id: 'com.pof.mobileapp.iphone',
    app_id: 'POF.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Plex',
    bundle_id: 'com.plexapp.plex',
    app_id: 'Plex.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'PlexMobile_29x29', 29 ],
            [ 'PlexMobile_29x29@2x', 58 ],
            [ 'PlexMobile_40x40', 40 ],
            [ 'PlexMobile_40x40@2x', 80 ],
            [ 'PlexMobile_57x57', 57 ],
            [ 'PlexMobile_57x57@2x', 114 ],
            [ 'PlexMobile_60x60', 60 ],
            [ 'PlexMobile_60x60@2x', 120 ],
            [ 'PlexMobile_72x72', 72 ],
            [ 'PlexMobile_72x72@2x', 144 ],
            [ 'PlexMobile_76x76', 76 ],
            [ 'PlexMobile_76x76@2x', 152 ],
            [ 'PlexMobile_114x114', 14 ],
            [ 'PlexMobile_114x114@2x', 228 ],
            [ 'PlexMobile_144x144', 44 ],
            [ 'PlexMobile_144x144@2x', 288 ]
        ]
    }
});

mios.icons.push({
    name: 'Pluto TV',
    bundle_id: 'tv.pluto.ios',
    app_id: 'ios.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'PNC Mobile',
    bundle_id: 'com.pnc.pncmobile',
    app_id: 'Pnc.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'appicon', 60 ],
            [ 'appicon@2x', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'Pocket',
    bundle_id: 'com.ideashower.ReadItLaterPro',
    app_id: 'ReadItLaterPro.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'ProTube for YouTube',
    bundle_id: 'de.j-gessner.protube2',
    app_id: 'ProTube 2.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'PSECU',
    bundle_id: 'com.PSECU.Mobile',
    app_id: 'PSECU Mobile.app',
    psd_id: false,
    icons: {
        appicon: true,
        custom: [
            [ 'icon', 60 ],
            [ 'icon@2x', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'Puffin Free',
    bundle_id: 'com.cloudmosa.PuffinFree',
    app_id: 'Puffin Free.app',
    psd_id: false,
    icons: {
        icon: true,
        custom: [
            [ 'Icon-60', 60 ],
            [ 'Icon-80', 80 ],
            [ 'Icon-120', 120 ],
            [ 'Icon-152', 152 ]
        ]
    }
});

mios.icons.push({
    name: 'Pushbullet',
    bundle_id: 'com.pushbullet.client',
    app_id: 'Pushbullet.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'QQ International',
    bundle_id: 'com.tencent.mqq',
    app_id: 'QQ.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'AppIcon-129x29', 29 ],
            [ 'AppIcon-129x29@2x', 58 ],
            [ 'AppIcon-129x29@2x~ipad', 58 ],
            [ 'AppIcon-129x29@3x', 87 ],
            [ 'AppIcon-129x29~ipad', 87 ],
            [ 'AppIcon-140x40@2x', 80 ],
            [ 'AppIcon-140x40@2x~ipad', 80 ],
            [ 'AppIcon-157x57', 57 ],
            [ 'AppIcon-157x57@2x', 114 ],
            [ 'AppIcon-160x60@2x', 120 ],
            [ 'AppIcon-160x60@3x', 180 ],
            [ 'AppIcon-172x72@2x~ipad', 144 ],
            [ 'AppIcon-172x72~ipad', 72 ],
            [ 'AppIcon-176x76@2x~ipad', 156 ],
            [ 'AppIcon-176x76~ipad', 76 ]
        ]
    }
});

mios.icons.push({
    name: 'QR Reader',
    bundle_id: 'com.TapMediaLtd.QRReader',
    app_id: 'QRReader.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'Icon', 60 ],
            [ 'Icon@2x', 120 ],
            [ 'Icon-120', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'QuizUp',
    bundle_id: 'com.plainvanillacorp.quizup',
    app_id: 'QuizUp.app',
    psd_id: false,
    icons: {
        icon: true,
        custom: [
            [ 'Icon-29', 29 ],
            [ 'Icon-29@2x', 58 ]
        ]
    }
});

mios.icons.push({
    name: 'RadarScope',
    bundle_id: 'com.basevelocity.RadarScope',
    app_id: false,
    psd_id: false,
    icons: {
        custom: [
            [ 'RadarScope-iOS App Icon29x29', 29 ],
            [ 'RadarScope-iOS App Icon29x29@2x', 58 ],
            [ 'RadarScope-iOS App Icon29x29@2x~ipad', 58 ],
            [ 'RadarScope-iOS App Icon29x29~ipad', 29 ],
            [ 'RadarScope-iOS App Icon40x40@2x', 80 ],
            [ 'RadarScope-iOS App Icon40x40@2x~ipad', 80 ],
            [ 'RadarScope-iOS App Icon40x40~ipad', 40 ],
            [ 'RadarScope-iOS App Icon50x50@2x~ipad', 100 ],
            [ 'RadarScope-iOS App Icon50x50~ipad', 50 ],
            [ 'RadarScope-iOS App Icon57x57', 57 ],
            [ 'RadarScope-iOS App Icon57x57@2x', 114 ],
            [ 'RadarScope-iOS App Icon60x60@2x', 120 ],
            [ 'RadarScope-iOS App Icon72x72@2x~ipad', 72 ],
            [ 'RadarScope-iOS App Icon72x72~ipad', 144 ],
            [ 'RadarScope-iOS App Icon76x76@2x~ipad', 152 ],
            [ 'RadarScope-iOS App Icon76x76~ipad', 76 ]
        ]
    }
});

mios.icons.push({
    name: 'Rdio',
    bundle_id: 'com.rdio.player',
    app_id: 'Rdio.app',
    psd_id: false,
    icons: {
        folder: '/Images',
        icon: true,
        custom: [
            [ 'Icon-120', 120 ],
            [ 'Icon-152', 152 ]
        ]
    }
});

mios.icons.push({
    name: 'Red Laser',
    bundle_id: 'com.ebay.redlaserproper',
    app_id: 'RedLaser.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'rl-icon', 60 ],
            [ 'rl-icon@2x', 120 ],
            [ 'rl-icon-29', 29 ],
            [ 'rl-icon-29@2x', 58 ],
            [ 'rl-icon-40@2x', 80 ],
            [ 'rl-icon-60@2x', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'Redd',
    bundle_id: 'com.craigmerchant.redd',
    app_id: 'Redd.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Reddit Alien Blue',
    bundle_id: 'com.reddit.alienblue',
    app_id: 'AlienBlue.app',
    psd_id: false,
    icons: {
        appicon: true,
        icon: true,
        custom: [
            [ 'HDIcon', 60 ],
            [ 'HDIcon@2x', 120 ],
            [ 'HDIcon-50', 50 ],
            [ 'HDIcon-72', 72 ],
            [ 'HDIcon-76', 76 ],
            [ 'HDIcon-76@2x', 152 ],
            [ 'HDIcon-144', 144 ]
        ]
    }
});

mios.icons.push({
    name: 'Reddit Alien Blue HD',
    bundle_id: 'com.reddit.alienbluehd',
    app_id: 'AlienBlueHD.app',
    psd_id: false,
    icons: {
        appicon: true,
        icon: true,
        custom: [
            [ 'HDIcon', 60 ],
            [ 'HDIcon@2x', 120 ],
            [ 'HDIcon-50', 50 ],
            [ 'HDIcon-72', 72 ],
            [ 'HDIcon-76', 76 ],
            [ 'HDIcon-76@2x', 152 ],
            [ 'HDIcon-144', 144 ]
        ]
    }
});

mios.icons.push({
    name: 'Reddit AMA',
    bundle_id: 'com.reddit.ama',
    app_id: 'ama.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Redfin',
    bundle_id: 'com.redfin.redfin',
    app_id: 'Redfin.app ',
    psd_id: false,
    icons: {
        appicon: true,
        icon: true
    }
});

mios.icons.push({
    name: 'Reeder',
    bundle_id: 'com.reederapp.rkit2.ios',
    app_id: false,
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Retail Me Not',
    bundle_id: 'com.whaleshark.retailmenot',
    app_id: 'RetailMeNot.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Retry',
    bundle_id: 'com.rovio.retry',
    app_id: 'retry.app ',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Rhapsody',
    bundle_id: 'com.rhapsody.iphone.Rhapsody3',
    app_id: 'Rhapsody.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'RhapsodyIcon-120', 120 ],
            [ 'RhapsodyIcon-57', 57 ],
            [ 'RhapsodyIcon-57@2x', 114 ],
            [ 'RhapsodyIcon-72', 72 ],
            [ 'RhapsodyIcon-72@2x', 144 ],
            [ 'RhapsodyIcon-76', 76 ],
            [ 'RhapsodyIcon-76@2x', 152 ]
        ]
    }
});

mios.icons.push({
    name: 'Robinhood',
    bundle_id: 'com.robinhood.release.Robinhood',
    app_id: 'Robinhood.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Screeny',
    bundle_id: 'com.nfnlabs.screeny',
    app_id: 'Screeny.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Setlist',
    bundle_id: 'com.mediumrare.setlist',
    app_id: 'Setlist.app',
    psd_id: false,
    icons: {
        icon: true
    }
});

mios.icons.push({
    name: 'Shazam Free',
    bundle_id: 'com.shazam.Shazam',
    app_id: 'Shazam.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'AppIcons_Free57x57', 57 ],
            [ 'AppIcons_Free57x57@2x', 114 ],
            [ 'AppIcons_Free60x60@2x', 120 ],
            [ 'AppIcons_Free72x72@2x~ipad', 144 ],
            [ 'AppIcons_Free72x72~ipad', 72 ],
            [ 'AppIcons_Free76x76@2x~ipad', 152 ],
            [ 'AppIcons_Free76x76~ipad', 76 ]
        ]
    }
});

mios.icons.push({
    name: 'Shazam Encore',
    bundle_id: 'com.shazam.encore.Shazam',
    app_id: 'Shazam.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'AppIcons_Encore57x57', 57 ],
            [ 'AppIcons_Encore57x57@2x', 114 ],
            [ 'AppIcons_Encore60x60@2x', 120 ],
            [ 'AppIcons_Encore72x72@2x~ipad', 144 ],
            [ 'AppIcons_Encore72x72~ipad', 72 ],
            [ 'AppIcons_Encore76x76@2x~ipad', 152 ],
            [ 'AppIcons_Encore76x76~ipad', 76 ]
        ]
    }
});

mios.icons.push({
    name: 'Showtime Anytime',
    bundle_id: 'com.showtime.showtimeanytime',
    app_id: 'showtimeanytime.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Simple',
    bundle_id: 'com.simple.Simple',
    app_id: 'Simple.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Sing!',
    bundle_id: 'com.smule.sing',
    app_id: 'Sing!.app',
    psd_id: false,
    icons: {
        appicon: true,
        custom: [
            [ 'icon_appicon_100', 30 ],
            [ 'icon_appicon_100@2x', 60 ],
            [ 'icon_appicon_100@2x~ipad', 100 ],
            [ 'icon_appicon_100~ipad', 50 ]
        ]
    }
});

mios.icons.push({
    name: 'Skype',
    bundle_id: 'com.skype.skype',
    app_id: 'Skype.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Slack',
    bundle_id: 'com.tinyspeck.chatlyio',
    app_id: 'slack.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Slacker Radio',
    bundle_id: 'com.slacker.radio',
    app_id: 'Slacker.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Sleep Cycle',
    bundle_id: 'com.lexwarelabs.goodmorning',
    app_id: 'GoodMorning.app',
    psd_id: false,
    icons: {
        appicon: true,
        custom: [
            [ 'icon_29', 29 ],
            [ 'icon_40', 40 ],
            [ 'icon_57', 57 ],
            [ 'icon_58', 58 ],
            [ 'icon_60', 60 ],
            [ 'icon_80', 80 ],
            [ 'icon_114', 114 ],
            [ 'icon_120', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'SleepGenius',
    bundle_id: 'com.sleepgenius.SleepGenius2',
    app_id: 'SleepGenius.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Slick Deals',
    bundle_id: 'com.slickdeals.mobile',
    app_id: 'Slickdeals.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Smartplayer',
    bundle_id: 'com.shaddeen.SmartPlayer',
    app_id: false,
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'SnapChat',
    bundle_id: 'com.toyopagroup.picaboo',
    app_id: 'Snapchat.app',
    psd_id: false,
    icons: {
        appicon: true,
        icon: true,
        custom: [
            [ 'Icon-66', 77 ],
            [ 'Icon-75', 75 ],
            [ 'Icon-80', 80 ],
            [ 'Icon-87', 87 ],
            [ 'Icon-120', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'Sniper Shooter',
    bundle_id: 'com.fungames.snipershooter',
    app_id: 'template.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'icon', 60 ],
            [ 'icon16', 16 ],
            [ 'icon57', 57 ],
            [ 'icon72', 72 ],
            [ 'icon75', 75 ],
            [ 'icon76', 76 ],
            [ 'icon114', 114 ],
            [ 'icon120', 120 ],
            [ 'icon144', 144 ],
            [ 'icon152', 152 ]
        ]
    }
});

mios.icons.push({
    name: 'Sosh',
    bundle_id: 'com.sosh.turtle',
    app_id: 'Sosh.app ',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'SoundCloud',
    bundle_id: 'com.soundcloud.TouchApp',
    app_id: 'SoundCloud.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'SoundHound',
    bundle_id: 'com.melodis.soundhound.free',
    app_id: 'midomi-free.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'AppIcon-Freemium29x29@2x', 58 ],
            [ 'AppIcon-Freemium29x29@2x~ipad', 58 ],
            [ 'AppIcon-Freemium29x29@3x', 87 ],
            [ 'AppIcon-Freemium29x29~ipad', 29 ],
            [ 'AppIcon-Freemium40x40@2x', 80 ],
            [ 'AppIcon-Freemium40x40@2x~ipad', 80 ],
            [ 'AppIcon-Freemium40x40@3x', 120 ],
            [ 'AppIcon-Freemium40x40~ipad', 40 ],
            [ 'AppIcon-Freemium60x60@2x', 120 ],
            [ 'AppIcon-Freemium60x60@3x', 180 ],
            [ 'AppIcon-Freemium76x76@2x~ipad', 152 ],
            [ 'AppIcon-Freemium76x76~ipad', 76 ]
        ]
    }
});

mios.icons.push({
    name: 'SoundHound Pro',
    bundle_id: 'com.melodis.midomi',
    app_id: 'midomi.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'AppIcon-Inf29x29@2x', 58 ],
            [ 'AppIcon-Inf29x29@2x~ipad', 58 ],
            [ 'AppIcon-Inf29x29@3x', 87 ],
            [ 'AppIcon-Inf29x29~ipad', 29 ],
            [ 'AppIcon-Inf40x40@2x', 80 ],
            [ 'AppIcon-Inf40x40@2x~ipad', 80 ],
            [ 'AppIcon-Inf40x40@3x', 120 ],
            [ 'AppIcon-Inf40x40~ipad', 40 ],
            [ 'AppIcon-Inf60x60@2x', 120 ],
            [ 'AppIcon-Inf60x60@3x', 180 ],
            [ 'AppIcon-Inf76x76@2x~ipad', 152 ],
            [ 'AppIcon-Inf76x76~ipad', 76 ]
        ]
    }
});

mios.icons.push({
    name: 'Splitwise',
    bundle_id: 'com.Splitwise.SplitwiseMobile',
    app_id: 'Splitwise.app',
    psd_id: false,
    icons: {
        custom: [
            [ '29', 29 ],
            [ '57', 57 ],
            [ '58', 58 ],
            [ '72', 72 ],
            [ '80', 80 ],
            [ '114', 114 ],
            [ '120', 120 ],
            [ '144', 144 ],
            [ 'appicon', 60 ],
            [ 'appicon@2x', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'Spotify',
    bundle_id: 'com.spotify.client',
    app_id: 'Spotify.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Springtomize',
    bundle_id: 'com.filippobiga.springtomize3-app',
    app_id: 'SpringtomizeApp.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'Icon40x40', 40 ],
            [ 'Icon40x40@2x', 80 ],
            [ 'Icon40x40@3x', 120 ],
            [ 'Icon60x60', 60 ],
            [ 'Icon60x60@2x', 120 ],
            [ 'Icon60x60@3x', 180 ],
            [ 'Icon76x76', 76 ],
            [ 'Icon76x76@2x', 152 ]
        ]
    }
});

mios.icons.push({
    name: 'Square Cash',
    bundle_id: 'com.squareup.cash',
    app_id: 'Cash.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Starbucks',
    bundle_id: 'com.starbucks.mystarbucks',
    app_id: 'Starbucks.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Starbucks Malaysia',
    bundle_id: 'com.starbucks.my',
    app_id: '',
    psd_id: false,
    icons: {
        appicon: true,
        custom: [
            [ 'AppIcon 60', 60 ],
            [ 'AppIcon 60@2x', 120 ],
            [ 'AppIcon 60@3x', 180 ],
            [ 'AppIcon 120', 120 ],
            [ 'AppIcon', 57 ],
            [ 'AppIcon@2x', 114 ]
        ]
    }
});

mios.icons.push({
    name: 'Steam',
    bundle_id: 'com.valvesoftware.Steam',
    app_id: 'Steam.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'Steam57', 57 ],
            [ 'Steam60', 60 ],
            [ 'Steam72', 72 ],
            [ 'Steam76', 76 ],
            [ 'Steam114', 114 ],
            [ 'Steam120', 120 ],
            [ 'Steam144', 144 ],
            [ 'Steam152', 152 ]
        ]
    }
});

mios.icons.push({
    name: 'Strava Running and Cycling',
    bundle_id: 'com.strava.stravaride',
    app_id: 'Strava.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Strong',
    bundle_id: 'com.cameronchow.Strong',
    app_id: 'Strong.app ',
    psd_id: false,
    icons: {
        custom: [
            [ 'AppIcon-iOS729x29',          29 ],
            [ 'AppIcon-iOS729x29~ipad',     29 ],
            [ 'AppIcon-iOS729x29@2x',       58 ],
            [ 'AppIcon-iOS729x29@2x~ipad',  58 ],
            [ 'AppIcon-iOS729x29@3x',       87 ],
            [ 'AppIcon-iOS729x29@3x~ipad',  87 ],

            [ 'AppIcon-iOS740x40',          40 ],
            [ 'AppIcon-iOS740x40~ipad',     40 ],
            [ 'AppIcon-iOS740x40@2x',       80 ],
            [ 'AppIcon-iOS740x40@2x~ipad',  80 ],
            [ 'AppIcon-iOS740x40@3x',       120 ],
            [ 'AppIcon-iOS740x40@3x~ipad',  120 ],

            [ 'AppIcon-iOS750x50',          50 ],
            [ 'AppIcon-iOS750x50@2x',       100 ],

            [ 'AppIcon-iOS757x57',          57 ],
            [ 'AppIcon-iOS757x57@2x',       114 ],

            [ 'AppIcon-iOS760x60',          60 ],
            [ 'AppIcon-iOS760x60@2x',       120 ],
            [ 'AppIcon-iOS760x60@3x',       180 ],

            [ 'AppIcon-iOS772x72',          72 ],
            [ 'AppIcon-iOS772x72~ipad',     72 ],
            [ 'AppIcon-iOS772x72@2x',       144 ],
            [ 'AppIcon-iOS772x72@2x~ipad',  144 ],

            [ 'AppIcon-iOS776x76',          76 ],
            [ 'AppIcon-iOS776x76~ipad',     76 ],
            [ 'AppIcon-iOS776x76@2x',       152 ],
            [ 'AppIcon-iOS776x76@2x~ipad',  152 ],

            [ 'AppIcon-iOS7120x120',        120 ]
        ]
    }
});

mios.icons.push({
    name: 'Sunrise Calendar',
    bundle_id: 'am.sunrise.ios',
    app_id: 'sunrise-ios.app ',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Super',
    bundle_id: 'me.super.Super',
    app_id: 'Super.app ',
    psd_id: false,
    icons: {
        appicon: true,
        custom: [
            [ 'IconBars', 60 ],
            [ 'IconBars@2x', 120 ],
            [ 'IconBars@3x', 180 ]
        ]
    }
});

mios.icons.push({
    name: 'Superimpose',
    bundle_id: 'com.beltola.superimpose',
    app_id: 'Superimpose.app',
    psd_id: false,
    icons: {
        appicon: true,
        icon: true
    }
});

mios.icons.push({
    name: 'Swarm',
    bundle_id: 'com.foursquare.robin',
    app_id: 'Swarm.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Swift Key',
    bundle_id: 'com.swiftkey.SwiftKeyApp',
    app_id: 'SwiftKeyApp.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Sybu for Kodi',
    bundle_id: 'za.co.sybu.xbmc',
    app_id: 'xbmc.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Tango',
    bundle_id: 'com.sgiggle.Tango',
    app_id: 'Tango.app',
    psd_id: false,
    icons: {
        appicon: true,
        icon: true

    }
});

mios.icons.push({
    name: 'Tapatalk',
    bundle_id: 'com.quoord.Tapatalk',
    app_id: 'TapatalkFree.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'TeamViewer: Remote Control',
    bundle_id: 'com.teamviewer.rc',
    app_id: 'RemoteControl.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Telegram Messenger',
    bundle_id: 'ph.telegra.Telegraph',
    app_id: 'Telegram.app',
    psd_id: false,
    icons: {
        icon: true
    }
});

mios.icons.push({
    name: 'Telstra',
    bundle_id: 'com.telstra.telstra24x7iphone',
    app_id: 'Telstra 24x7.app',
    psd_id: false,
    icons: {
        appicon: true,
        icon: true,
        custom: [
            [ 'Icon-80', 80 ],
            [ 'Icon-120', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'Tinder',
    bundle_id: 'com.cardify.tinder',
    app_id: 'Tinder.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'ToDoMovies',
    bundle_id: 'com.taphive.todomovies3',
    app_id: 'TodoMovies.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Transcynd',
    bundle_id: 'us.compatic.Transcynd',
    app_id: 'Transcynd.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Transit App',
    bundle_id: 'com.samvermette.Transit',
    app_id: 'Transit.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Trivia Crack',
    bundle_id: 'com.etermax.preguntados',
    app_id: 'Preguntados.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Tubex for YouTube',
    bundle_id: 'com.baslas.tubex',
    app_id: 'Tubex.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Tumblr',
    bundle_id: 'com.tumblr.tumblr',
    app_id: 'Tumblr.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'TumblrIcon29x29@2x', 58 ],
            [ 'TumblrIcon29x29@2x~ipad', 58 ],
            [ 'TumblrIcon29x29~ipad', 29 ],
            [ 'TumblrIcon40x40@2x', 80 ],
            [ 'TumblrIcon40x40@2x~ipad', 80 ],
            [ 'TumblrIcon40x40~ipad', 40 ],
            [ 'TumblrIcon60x60@2x', 120 ],
            [ 'TumblrIcon60x60@3x', 180 ],
            [ 'TumblrIcon76x76@2x~ipad', 152 ],
            [ 'TumblrIcon76x76~ipad', 76 ]
        ]
    }
});

mios.icons.push({
    name: 'TuneIn Radio',
    bundle_id: 'com.tunein.TuneInRadio',
    app_id: 'TuneIn Radio.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'TurboTax Tax Preparation',
    bundle_id: 'com.intuit.turbotax',
    app_id: 'TurboTax.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Turf Wars',
    bundle_id: 'com.meanfreepathllc.turfwarslite',
    app_id: 'TurfWars.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'TV Guide',
    bundle_id: 'com.roundbox.TVGuide',
    app_id: false,
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'TWC TV',
    bundle_id: 'com.timewarnercable.simulcast',
    app_id: 'TWCTV.app',
    psd_id: false,
    icons: {
        icon: true
    }
});

mios.icons.push({
    name: 'Tweetbot',
    bundle_id: 'com.tapbots.Tweetbot3',
    app_id: 'Tweetbot.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Twitch',
    bundle_id: 'tv.twitch',
    app_id: 'Twitch.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'TwitchAppIcon29x29@2x', 58 ],
            [ 'TwitchAppIcon58x29@2x~ipad', 29 ],
            [ 'TwitchAppIcon29x29~ipad', 29 ],
            [ 'TwitchAppIcon40x40@2x', 80 ],
            [ 'TwitchAppIcon80x40@2x~ipad', 40 ],
            [ 'TwitchAppIcon40x40~ipad', 40 ],
            [ 'TwitchAppIcon60x60@2x', 120 ],
            [ 'TwitchAppIcon76x76@2x~ipad', 152 ],
            [ 'TwitchAppIcon76x76~ipad', 76 ]
        ]
    }
});

mios.icons.push({
    name: 'Twitter',
    bundle_id: 'com.atebits.Tweetie2',
    app_id: 'Twitter.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'ProductionAppIcon57x57', 57 ],
            [ 'ProductionAppIcon57x57@2x', 114 ],
            [ 'ProductionAppIcon60x60@2x', 120 ],
            [ 'ProductionAppIcon60x60@3x', 180 ],
            [ 'ProductionAppIcon72x72@2x~ipad', 144 ],
            [ 'ProductionAppIcon72x72~ipad', 72 ],
            [ 'ProductionAppIcon76x76@2x~ipad', 152 ],
            [ 'ProductionAppIcon76x76~ipad', 76 ]
        ]
    }
});

mios.icons.push({
    name: 'Twitterrific 5',
    bundle_id: 'com.iconfactory.Blackbird',
    app_id: 'Twitterrific.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Two Dots',
    bundle_id: 'com.weplaydots.twodots',
    app_id: 'twodots.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Uber',
    bundle_id: 'com.ubercab.UberClient',
    app_id: 'UberClient.app',
    psd_id: false,
    icons: {
        icon: true,
        custom: [
            [ 'Icon40', 40 ],
            [ 'Icon40@2x', 80 ],
            [ 'Icon60', 60 ],
            [ 'Icon60@2x', 120 ],
            [ 'Icon60@3x', 180 ]
        ]
    }
});

mios.icons.push({
    name: 'UpToDate',
    bundle_id: 'com.uptodate.uptodate',
    app_id: 'uptodate.app',
    psd_id: false,
    icons: {
        appicon: true,
        custom: [
            [ 'icon-app-white-11', 11 ],
            [ 'icon-app-white-29', 29 ],
            [ 'icon-app-white-50', 50 ],
            [ 'icon-app-white-57', 57 ],
            [ 'icon-app-white-58', 58 ],
            [ 'icon-app-white-72', 72 ],
            [ 'icon-app-white-114', 114 ]
        ]
    }
});

mios.icons.push({
    name: 'Urban Spoon',
    bundle_id: 'com.urbanspoon.urbanspin',
    app_id: 'urbanspin.app',
    psd_id: false,
    icons: {
        icon: true,
        custom: [
            [ 'Icon-58', 58 ],
            [ 'Icon-80', 80 ],
            [ 'Icon-120', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'Vainglory',
    bundle_id: 'com.superevilmegacorp.vainglory.iphone',
    app_id: 'GameKindred.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'iOS6iPad', 72 ],
            [ 'iOS6iPad@2x', 114 ],
            [ 'iOS6iPadSpotlight', 50 ],
            [ 'iOS6iPadSpotlight@2x', 100 ],
            [ 'iOS7UniversalSettings', 29 ],
            [ 'iOS7UniversalSettings@2x', 58 ],
            [ 'iOS7UniversalSpotlight', 40 ],
            [ 'iOS7UniversalSpotlight@2x', 80 ],
            [ 'iOS7iPad', 76 ],
            [ 'iOS7iPad@2x', 152 ],
            [ 'iOS7iPhone@2x', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'Venmo - International',
    bundle_id: 'net.kortina.labs.Venmo',
    app_id: 'Venmo.app',
    psd_id: false,
    icons: {
        appicon: true,
        icon: true,
        custom: [
            [ 'IconSpotlight7', 40 ]
        ]
    }
});

mios.icons.push({
    name: 'Verizon Cloud',
    bundle_id: 'com.verizon.cloud',
    app_id: 'Verizon.app',
    psd_id: false,
    icons: {
        icon: true
    }
});

mios.icons.push({
    name: 'Verizon My Verizon',
    bundle_id: 'com.vzw.hss.myverizon',
    app_id: 'My Verizon.app',
    psd_id: false,
    icons: {
        appicon: true,
        icon: true,
        custom: [
            [ 'icon7@2x', 120 ],
            [ 'icon7@2x~ipad', 152 ],
            [ 'icon7@3x', 180 ],
            [ 'icon7spotlight@2x', 80 ],
            [ 'icon7spotlight~ipad', 40 ],
            [ 'icon7~ipad', 76 ]
        ]
    }
});

mios.icons.push({
    name: 'Vevo',
    bundle_id: 'com.vevo.iphone',
    app_id: 'VEVO.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Viber',
    bundle_id: 'com.viber',
    app_id: 'Viber.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Vimeo',
    bundle_id: 'com.vimeo',
    app_id: 'Vimeo.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'VINE',
    bundle_id: 'com.vine.iphone',
    app_id: 'iphone.app',
    psd_id: false,
    icons: {
        custom: [
            [ '29', 29 ],
            [ '40', 40 ],
            [ '50', 50 ],
            [ '512', 12 ],
            [ '57', 57 ],
            [ '58', 58 ],
            [ '60', 60 ],
            [ '72', 72 ],
            [ '76', 76 ],
            [ '80', 80 ],
            [ '100', 100 ],
            [ '114', 114 ],
            [ '120', 120 ],
            [ '144', 144 ],
            [ '152', 152 ],
            [ 'ReleaseIcon29x29', 29 ],
            [ 'ReleaseIcon29x29@2x', 58 ],
            [ 'ReleaseIcon29x29@2x~ipad', 58 ],
            [ 'ReleaseIcon29x29~ipad', 29 ],
            [ 'ReleaseIcon40x40@2x', 80 ],
            [ 'ReleaseIcon40x40@2x~ipad', 80 ],
            [ 'ReleaseIcon40x40~ipad', 40 ],
            [ 'ReleaseIcon50x50@2x~ipad', 100 ],
            [ 'ReleaseIcon50x50~ipad', 50 ],
            [ 'ReleaseIcon57x57', 57 ],
            [ 'ReleaseIcon57x57@2x', 114 ],
            [ 'ReleaseIcon60x60@2x', 120 ],
            [ 'ReleaseIcon72x72@2x~ipad', 144 ],
            [ 'ReleaseIcon72x72~ipad', 72 ],
            [ 'ReleaseIcon76x76@2x~ipad', 152 ],
            [ 'ReleaseIcon76x76~ipad', 76 ]
        ]
    }
});

mios.icons.push({
    name: 'Visage Lab',
    bundle_id: 'com.vicman.visagelab',
    app_id: 'VisageLab.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Visage Lab Pro',
    bundle_id: 'com.vicman.visagelabprohd',
    app_id: 'VisageLab_PRO.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'AppIcon-357x57', 57 ],
            [ 'AppIcon-357x57@2x', 114 ],
            [ 'AppIcon-360x60@2x', 120 ],
            [ 'AppIcon-360x60@3x', 180 ],
            [ 'AppIcon-372x72@2x~ipad', 144 ],
            [ 'AppIcon-372x72~ipad', 72 ],
            [ 'AppIcon-376x76@2x~ipad', 156 ],
            [ 'AppIcon-376x76~ipad', 76 ]
        ]

    }
});

mios.icons.push({
    name: 'Visage Lab Pro HD',
    bundle_id: 'com.vicman.visagelabprohd',
    app_id: 'VisageLab_PRO_HD.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'WakeUp',
    bundle_id: 'com.tmadonia.WakeUp',
    app_id: false,
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Walgreens',
    bundle_id: 'com.usablenet.walgreens',
    app_id: 'Sparkle.app',
    psd_id: false,
    icons: {
        appicon: true,
        icon: true
    }
});

mios.icons.push({
    name: 'Wallapop',
    bundle_id: 'com.secondhanding.WallaPop',
    app_id: 'Wallapop.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'AppIcon-AppStore29x29@2x', 58 ],
            [ 'AppIcon-AppStore29x29@2x~ipad', 58 ],
            [ 'AppIcon-AppStore29x29~ipad', 29 ],
            [ 'AppIcon-AppStore40x40@2x', 80 ],
            [ 'AppIcon-AppStore40x40@2x~ipad', 80 ],
            [ 'AppIcon-AppStore40x40@3x', 120 ],
            [ 'AppIcon-AppStore40x40~ipad', 40 ],
            [ 'AppIcon-AppStore60x60@2x', 120 ],
            [ 'AppIcon-AppStore76x76@2x~ipad', 152 ],
            [ 'AppIcon-AppStore76x76~ipad', 76 ]
        ]
    }
});

mios.icons.push({
    name: 'Wallet',
    bundle_id: 'com.acrylic.Wallet',
    app_id: 'Wallet.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'Icon-Settings', 29 ],
            [ 'Icon-Settings@2x', 58 ],
            [ 'iPadAppIcon', 72 ],
            [ 'iPadAppIcon@2x', 144 ],
            [ 'icon', 60 ],
            [ 'icon@2x', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'Walmart',
    bundle_id: 'com.walmart.electronics',
    app_id: 'Walmart.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'Icon-120', 120 ],
            [ 'Icon-29', 29 ],
            [ 'Icon-29@2x', 58 ],
            [ 'Icon-57', 57 ],
            [ 'Icon-57@2x', 114 ],
            [ 'Icon-80', 80 ]
        ]
    }
});

mios.icons.push({
    name: 'Wattpad',
    bundle_id: 'com.fivemobile.wattpad',
    app_id: 'Wattpad.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Waze',
    bundle_id: 'com.waze.iphone',
    app_id: 'Waze.app',
    psd_id: false,
    icons: {
        appicon: true,
        custom: [
            [ '29x29', 29 ],
            [ '40x40', 40 ],
            [ '50x50', 50 ],
            [ '57x57', 57 ],
            [ '58x58', 58 ],
            [ '72x72', 72 ],
            [ '76x76', 76 ],
            [ '80x80', 80 ],
            [ '100x100 ', 100 ],
            [ '114x114', 114 ],
            [ '120x120 ', 120 ],
            [ '144x144', 144 ],
            [ '152x152', 152 ]
        ]

    }
});

mios.icons.push({
    name: 'We <3 It',
    bundle_id: 'com.weheartit',
    app_id: 'weheartit.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'The Weather Channel',
    bundle_id: 'com.weather.TWC',
    app_id: 'iPhone.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Weather Underground',
    bundle_id: 'com.wunderground.weatherunderground',
    app_id: 'wuflagship.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'WeChat',
    bundle_id: 'com.tencent.xin',
    app_id: 'MicroMessenger.app',
    psd_id: false,
    icons: {
        appicon: true,
        custom: [
            [ 'Icon', 60 ],
            [ 'Icon@2x', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'Wegmans',
    bundle_id: 'com.wegmans.wegmansapp',
    app_id: 'Wegmans.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Weibo',
    bundle_id: 'com.sina.weibo',
    app_id: 'Weibo.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'icon', 60 ],
            [ 'icon@2x', 120 ],
            [ 'icon@3x', 180 ],
            [ 'icon_os7@2x', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'Wells Fargo',
    bundle_id: 'com.wf.mobilebanking',
    app_id: 'Wells_Fargo_Mobile_Banking_iPhone.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'wfAppIcon', 60 ],
            [ 'wfAppIcon@2x', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'WhatsApp',
    bundle_id: 'net.whatsapp.WhatsApp',
    app_id: 'WhatsApp.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'Icon-Settings', 29 ],
            [ 'Icon-Settings@2x', 58 ],
            [ 'Icon-Settings@3x', 87 ],
            [ 'Icon-Spotlight', 40 ],
            [ 'Icon-Spotlight@2x', 80 ],
            [ 'Icon-Spotlight@3x', 120 ],
            [ 'Icon-iOS6', 57 ],
            [ 'Icon-iOS6@2x', 114 ],
            [ 'Icon', 60 ],
            [ 'Icon@2x', 120 ],
            [ 'Icon@3x', 180 ]
        ]
    }
});

mios.icons.push({
    name: 'Wikipanion',
    bundle_id: 'com.laya.osiris.wikipanion',
    app_id: 'Wikipanion.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'Wikipanion', 60 ],
            [ 'Wikipanion29', 29 ],
            [ 'Wikipanion50', 50 ],
            [ 'Wikipanion58', 58 ],
            [ 'Wikipanion72', 72 ],
            [ 'Wikipanion114', 114 ],
            [ 'Wikipanion_AppIcon_29', 29 ],
            [ 'Wikipanion_AppIcon_29@2x', 58 ],
            [ 'Wikipanion_AppIcon_29@3x', 87 ],
            [ 'Wikipanion_AppIcon_40', 40 ],
            [ 'Wikipanion_AppIcon_40@2x', 80 ],
            [ 'Wikipanion_AppIcon_60@2x', 120 ],
            [ 'Wikipanion_AppIcon_60@3x', 180 ],
            [ 'Wikipanion_AppIcon_76', 76 ],
            [ 'Wikipanion_AppIcon_76@2x', 152 ]
        ]
    }
});

mios.icons.push({
    name: 'Wikipanion iPad',
    bundle_id: 'com.laya.osiris.wikipanion.ipad',
    app_id: 'Wikipanion.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'Wikipanion', 60 ],
            [ 'Wikipanion29', 29 ],
            [ 'Wikipanion50', 50 ],
            [ 'Wikipanion58', 58 ],
            [ 'Wikipanion72', 72 ],
            [ 'Wikipanion114', 114 ],
            [ 'Wikipanion_AppIcon_29', 29 ],
            [ 'Wikipanion_AppIcon_29@2x', 58 ],
            [ 'Wikipanion_AppIcon_29@3x', 87 ],
            [ 'Wikipanion_AppIcon_40', 40 ],
            [ 'Wikipanion_AppIcon_40@2x', 80 ],
            [ 'Wikipanion_AppIcon_60@2x', 120 ],
            [ 'Wikipanion_AppIcon_60@3x', 180 ],
            [ 'Wikipanion_AppIcon_76', 76 ],
            [ 'Wikipanion_AppIcon_76@2x', 152 ]
        ]
    }
});

mios.icons.push({
    name: 'Wikipedia',
    bundle_id: 'org.wikimedia.wikipedia',
    app_id: 'Wikipedia.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Winterboard',
    bundle_id: 'com.saurik.WinterBoard',
    app_id: 'WinterBoard.app',
    psd_id: false,
    icons: false
});

mios.icons.push({
    name: 'Wiper',
    bundle_id: 'com.gowiper.wiper',
    app_id: 'Wiper.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'WiperAppIcon29x29', 29 ],
            [ 'WiperAppIcon29x29@2x', 58 ],
            [ 'WiperAppIcon29x29@2x~ipad', 58 ],
            [ 'WiperAppIcon29x29~ipad', 29 ],
            [ 'WiperAppIcon40x40@2x', 80 ],
            [ 'WiperAppIcon40x40@2x~ipad', 80 ],
            [ 'WiperAppIcon40x40~ipad', 40 ],
            [ 'WiperAppIcon50x50@2x~ipad', 100 ],
            [ 'WiperAppIcon50x50~ipad', 50 ],
            [ 'WiperAppIcon57x57', 57 ],
            [ 'WiperAppIcon57x57@2x', 114 ],
            [ 'WiperAppIcon60x60@2x', 120 ],
            [ 'WiperAppIcon72x72@2x~ipad', 144 ],
            [ 'WiperAppIcon72x72~ipad', 72 ],
            [ 'WiperAppIcon76x76@2x~ipad', 152 ],
            [ 'WiperAppIcon76x76~ipad', 76 ]
        ]
    }
});

mios.icons.push({
    name: 'Wish',
    bundle_id: 'com.contextlogic.Wish',
    app_id: 'Wish.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Wolfram Alpha',
    bundle_id: 'com.wolframalpha.wolframalpha',
    app_id: false,
    psd_id: false,
    icons: {
        custom: [
            [ 'WolframAlpha-AppIcon57x57',          57 ],
            [ 'WolframAlpha-AppIcon57x57@2x',       114 ],
            [ 'WolframAlpha-AppIcon60x60@2x',       120 ],
            [ 'WolframAlpha-AppIcon60x60@3x',       180 ],
            [ 'WolframAlpha-AppIcon72x72~ipad',     72 ],
            [ 'WolframAlpha-AppIcon72x72@2x~ipad',  144 ],
            [ 'WolframAlpha-AppIcon76x76~ipad',     76 ],
            [ 'WolframAlpha-AppIcon76x76@2x~ipad',  152 ]
        ]
    }
});

mios.icons.push({
    name: 'Words with Friends Paid',
    bundle_id: 'com.newtoyinc.WordsWithFriendsPaid',
    app_id: 'WordsWithFriendsPaid.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'World Lens',
    bundle_id: 'com.questvisual.MobileTranslator',
    app_id: 'WordLens.app ',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Wunderlist',
    bundle_id: 'com.6wunderkinder.wunderlistmobile',
    app_id: 'Wunderlist.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'X Mod Games',
    bundle_id: 'com.flamingo.XModGame',
    app_id: 'XModGame.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'icon_57', 57 ],
            [ 'icon_72', 72 ],
            [ 'icon_76', 76 ],
            [ 'icon_114', 114 ],
            [ 'icon_120', 120 ],
            [ 'icon_144', 144 ],
            [ 'icon_152', 152 ],
            [ 'Icon-iPhone', 60 ],
            [ 'Icon-iPhone@2x', 120 ],
            [ 'Icon-iPhone@3x', 180 ]
        ]
    }
});

mios.icons.push({
    name: 'XBMC',
    bundle_id: 'org.xbmc.xbmc-ios',
    app_id: 'XBMC.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Xero',
    bundle_id: 'JEC2FK53N4.com.xero.XeroTouch',
    app_id: 'Xero Touch.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Xfinity Conenct',
    bundle_id: 'com.Comcast.ComcastOTT',
    app_id: 'XfinityConnect.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Xfinity MyAccount',
    bundle_id: 'com.comcast.cim.myaccount',
    app_id: 'XfinityMyAccount.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Xfinity Play',
    bundle_id: 'com.comcast.cim.xplay',
    app_id: 'XPlay.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Xfinity Remote',
    bundle_id: 'com.comcast.cim.xfinitytv',
    app_id: 'XfinityRemote.app',
    psd_id: false,
    icons: {
        appicon: true,
        icon: true,
        custom: [
            [ 'Icon-120', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'XKit',
    bundle_id: 'com.StudioXenix.XKit',
    app_id: false,
    psd_id: false,
    icons: {
        custom: [
            [ 'AppIcon-176x76~ipad', 76 ],
            [ 'AppIcon-176x76@2x~ipad', 152 ],
            [ 'AppIcon-172x72~ipad', 72 ],
            [ 'AppIcon-172x72@2x~ipad', 144 ],
            [ 'AppIcon-160x60@2x', 120 ],
            [ 'AppIcon-160x60@3x', 180 ],
            [ 'AppIcon-140x40~ipad', 40 ],
            [ 'AppIcon-140x40@2x~ipad', 80 ],
            [ 'AppIcon-129x29', 29 ],
            [ 'AppIcon-129x29@2x', 58 ],
            [ 'AppIcon-129x29@3x', 87 ]
        ]
    }
});

mios.icons.push({
    name: 'Yahoo',
    bundle_id: 'com.yahoo.frontpage',
    app_id: 'com.yahoo.frontpage-314036-distribution.app',
    psd_id: false,
    icons: {
        appicon: true,
        icon: true
    }
});

mios.icons.push({
    name: 'Yahoo Fantasy Football',
    bundle_id: 'com.yahoo.ffootball2009',
    app_id: 'com.yahoo.mobile.ios.fantasyfootball-2863-distribution.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Yahoo Mail',
    bundle_id: 'com.yahoo.Aerogram',
    app_id: 'com.yahoo.Aerogram-34519-distribution.app',
    psd_id: false,
    icons: {
        custom: [
            [ 'Aerogram App Icon29x29', 29 ],
            [ 'Aerogram App Icon29x29~ipad', 29 ],
            [ 'Aerogram App Icon29x29@2x', 58 ],
            [ 'Aerogram App Icon29x29@2x~ipad', 58 ],
            [ 'Aerogram App Icon29x29@3x', 87 ],
            [ 'Aerogram App Icon29x29@3x~ipad', 87 ],

            [ 'Aerogram App Icon40x40', 40 ],
            [ 'Aerogram App Icon40x40~ipad', 40 ],
            [ 'Aerogram App Icon40x40@2x', 80 ],
            [ 'Aerogram App Icon40x40@2x~ipad', 80 ],
            [ 'Aerogram App Icon40x40@3x', 120 ],
            [ 'Aerogram App Icon40x40@3x~ipad', 120 ],

            [ 'Aerogram App Icon50x50', 50 ],
            [ 'Aerogram App Icon50x50@2x', 100 ],

            [ 'Aerogram App Icon57x57', 57 ],
            [ 'Aerogram App Icon57x57@2x', 114 ],

            [ 'Aerogram App Icon60x60', 60 ],
            [ 'Aerogram App Icon60x60@2x', 120 ],
            [ 'Aerogram App Icon60x60@3x', 180 ],

            [ 'Aerogram App Icon72x72', 72 ],
            [ 'Aerogram App Icon72x72~ipad', 72 ],
            [ 'Aerogram App Icon72x72@2x', 144 ],
            [ 'Aerogram App Icon72x72@2x~ipad', 144 ],

            [ 'Aerogram App Icon76x76', 76 ],
            [ 'Aerogram App Icon76x76~ipad', 76 ],
            [ 'Aerogram App Icon76x76@2x', 152 ],
            [ 'Aerogram App Icon76x76@2x~ipad', 152 ],

            [ 'Aerogram App Icon120x120', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'Yahoo News',
    bundle_id: 'com.yahoo.atom',
    app_id: 'com.yahoo.atom-1536-distribution.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Yahoo Weather',
    bundle_id: 'com.yahoo.weather',
    app_id: 'com.yahoo.weather-34547-distribution.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'YB',
    bundle_id: 'com.maxandcodesign.yo-bitch',
    app_id: 'YB.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Yelp',
    bundle_id: 'com.yelp.yelpiphone',
    app_id: 'Yelp.app',
    psd_id: false,
    icons: {
        appicon: true,
        custom: [
            [ 'yelp', 40 ],
            [ 'yelp@2x', 80 ],
            [ 'yelp@3x', 120 ]
        ]
    }
});

mios.icons.push({
    name: 'Yik Yak',
    bundle_id: 'engineering.locus.chatter',
    app_id: 'Yik Yak.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'YNAB',
    bundle_id: 'com.youneedabudget.ynab',
    app_id: 'YNAB.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Zedge',
    bundle_id: 'com.zedge.Zedge',
    app_id: 'ZEDGE.app',
    psd_id: false,
    icons: {
        appicon: true
    }
});

mios.icons.push({
    name: 'Zoosk',
    bundle_id: 'com.zoosk.Zoosk',
    app_id: 'Zoosk.app',
    psd_id: false,
    icons: {
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
        [ 'Icon-72@3x',        216 ],

        [ 'Icon-76',           76 ],
        [ 'Icon-76@2x',        152 ],
        [ 'Icon-76@3x',        228 ],

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

};;try {
    mios.build( arguments );
    if ( errors = mios.getErrors() ) alert( errors );
} catch (e) {
    alert( 'Program error' );
}