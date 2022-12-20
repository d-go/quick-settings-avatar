'use strict';

const { Adw, Gio, Gtk } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const { createRadio, createSlider, createSwitch } = Me.imports.utils.controls;

const SETTINGS = Object.freeze({
    MODE: 'avatar-mode',
    POSITION: 'avatar-position',
    SIZE: 'avatar-size',
    REAL_NAME: 'avatar-realname',
    USER_NAME: 'avatar-username',
    HOST_NAME: 'avatar-hostname',
    NO_BACKGROUND: 'avatar-nobackground',
});

function init() { }

function fillPreferencesWindow(window) {
    // Use the same GSettings schema as in `extension.js`
    const settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.quick-settings-avatar');

    // Create the preferences page
    const page = new Adw.PreferencesPage();

    const minimalOpt = createRadio({
        title: 'Minimal',
        subtitle: 'Opens the Users settings on click',
        value: 0,
        settings,
        settingId: SETTINGS.MODE
    });
    const popupOpt = createRadio({
        title: 'Pop up',
        subtitle: 'Shows a pop up with user related actions on click',
        value: 1,
        settings,
        settingId: SETTINGS.MODE,
        group: minimalOpt.radio
    });

    // Position group
    const positionGroup = new Adw.PreferencesGroup();
    positionGroup.set_title('Position');
    page.add(positionGroup);

    const rightOpt = createRadio({
        title: 'Right',
        value: 0,
        settings,
        settingId: SETTINGS.POSITION
    });
    const leftOpt = createRadio({
        title: 'Left',
        value: 1,
        settings,
        settingId: SETTINGS.POSITION,
        group: rightOpt.radio
    });

    positionGroup.add(rightOpt.row);
    positionGroup.add(leftOpt.row);

    // Appearance group
    const appearanceGroup = new Adw.PreferencesGroup();
    appearanceGroup.set_title('Appearance');
    page.add(appearanceGroup);

    const sizeControl = createSlider({
        title: 'Size',
        subtitle: '43 by default (matching the quick toggle icons)',
        min: 15,
        max: 75,
        step: 2,
        settings,
        settingId: SETTINGS.SIZE
    });
    sizeControl.slider.add_mark(43, Gtk.PositionType.BOTTOM, null);

    const realName = createSwitch({
        title: 'Show real name',
        subtitle: 'Depending on the name length, this will increase the panel width drastically',
        settings,
        settingId: SETTINGS.REAL_NAME
    });

    const userName = createSwitch({
        title: 'Show user name',
        settings,
        settingId: SETTINGS.USER_NAME
    });

    const hostName = createSwitch({
        title: 'Show host name',
        settings,
        settingId: SETTINGS.HOST_NAME
    });

    const noBackground = createSwitch({
        title: 'Remove button background',
        subtitle: 'Removes the default background that button toggles have',
        settings,
        settingId: SETTINGS.NO_BACKGROUND
    });

    appearanceGroup.add(sizeControl.row);
    appearanceGroup.add(realName.row);
    appearanceGroup.add(userName.row);
    appearanceGroup.add(hostName.row);
    appearanceGroup.add(noBackground.row);

    // Add our page to the window
    window.add(page);
}

