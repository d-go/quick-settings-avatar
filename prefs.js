import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { createRadio, createSlider, createSwitch } from './utils/controls.js';

const SETTINGS = Object.freeze({
    MODE: 'avatar-mode',
    POSITION: 'avatar-position',
    SIZE: 'avatar-size',
    REAL_NAME: 'avatar-realname',
    USER_NAME: 'avatar-username',
    HOST_NAME: 'avatar-hostname',
    NO_BACKGROUND: 'avatar-nobackground',
});

export default class QSAvatarPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        // Use the same GSettings schema as in `extension.js`
        const settings = this.getSettings('org.gnome.shell.extensions.quick-settings-avatar');


        // Create the preferences page
        const page = new Adw.PreferencesPage();

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
            subtitle: 'Removes the default background that toggle buttons have',
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
}
