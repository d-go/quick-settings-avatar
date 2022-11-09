'use strict';

const { Adw, Gio, Gtk } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();


function init() { }

function fillPreferencesWindow(window) {
    // Use the same GSettings schema as in `extension.js`
    const settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.quick-settings-avatar');

    // Create a preferences page and group
    const page = new Adw.PreferencesPage();
    const group = new Adw.PreferencesGroup();
    page.add(group);

    const addToggleSetting = (settingId, settingTitle) => {
        const row = new Adw.ActionRow({ title: settingTitle });
        group.add(row);

        // Create the switch and bind its value to the parametrized key
        const toggle = new Gtk.Switch({
            active: settings.get_boolean(settingId),
            valign: Gtk.Align.CENTER,
        });

        settings.bind(
            settingId,
            toggle,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );

        row.add_suffix(toggle);
        row.activatable_widget = toggle;
    };

    addToggleSetting('is-avatar-on-left', 'Show user avatar on the left');
    // addToggleSetting('is-large-avatar', 'Display a larger avatar');

    // Add our page to the window
    window.add(page);
}

