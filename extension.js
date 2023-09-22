import AccountsService from 'gi://AccountsService';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Shell from 'gi://Shell';
import St from 'gi://St';
import { Avatar } from 'resource:///org/gnome/shell/ui/userWidget.js';
import { QuickSettingsItem, SystemIndicator } from 'resource:///org/gnome/shell/ui/quickSettings.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

const QuickSettingsMenu = Main.panel.statusArea.quickSettings;
const SETTINGS = [
    'avatar-mode',
    'avatar-position',
    'avatar-size',
    'avatar-realname',
    'avatar-username',
    'avatar-hostname',
    'avatar-nobackground',
];

const AvatarItem = GObject.registerClass(
    class AvatarItem extends QuickSettingsItem {
        _init(settings) {
            super._init({
                style_class: 'icon-button avatar-button',
                canFocus: true,
                hasMenu: false,
            });

            if (settings.avatarNoBackground) {
                this.add_style_class_name('no-bg');
            }

            this._user = AccountsService.UserManager.get_default().get_user(GLib.get_user_name());

            // Main box container
            this._container = new St.BoxLayout({
                style_class: 'avatar-name-box',
                y_align: Clutter.ActorAlign.CENTER,
                x_align: Clutter.ActorAlign.CENTER,
                vertical: false,
            });

            this.set_y_align(Clutter.ActorAlign.CENTER);
            this.set_child(this._container);

            // Avatar picture
            const iconSize = settings.avatarSize % 2 === 0 ? settings.avatarSize + 1 : settings.avatarSize;
            this._avatarPicture = new Avatar(this._user, {
                iconSize,
                styleClass: 'avatar-picture',
            });
            this._avatarPicture.style = `icon-size: ${iconSize}px;`;


            // Avatar real name label
            const { avatarRealname, avatarUsername, avatarHostname } = settings;
            const isOnRight = settings.avatarPosition === 0;

            this._realNameLabel = new St.Label({
                style_class: 'avatar-realname-label',
                y_align: Clutter.ActorAlign.CENTER,
                x_align: isOnRight ? Clutter.ActorAlign.END : Clutter.ActorAlign.START,
                text: this._user.get_real_name() || GLib.get_real_name(),
            });

            // Avatar user name + host name label
            this._userNameLabel = new St.Label({
                style_class: 'avatar-username-label',
                y_align: Clutter.ActorAlign.CENTER,
                x_align: isOnRight ? Clutter.ActorAlign.END : Clutter.ActorAlign.START,
                text: (avatarUsername ? GLib.get_user_name() : '') + (avatarHostname ? `@${GLib.get_host_name()}` : ''),
            });

            // Labels container
            const labelsContainer = new St.BoxLayout({
                style_class: 'avatar-labels-box',
                y_align: Clutter.ActorAlign.CENTER,
                vertical: true,
            });

            if (avatarRealname) {
                labelsContainer.add_child(this._realNameLabel);
                this._userNameLabel.add_style_class_name('with-real-name');
            }

            if (avatarUsername || avatarHostname) {
                labelsContainer.add_child(this._userNameLabel);
            }


            // Depending on avatar position, add username first and then the avatar picture or viceversa
            if (isOnRight) {
                this._container.add_child(labelsContainer);
                this._container.add_child(this._avatarPicture);
            } else {
                this._container.add_child(this._avatarPicture);
                this._container.add_child(labelsContainer);
            }

            this._bindModeActions();

            // Listen to changes when avatar pic or real name is changed via settings
            this._user.connectObject('changed', this._updateAvatar.bind(this), this);
        }


        _updateAvatar() {
            this._avatarPicture.update();
            this._realNameLabel.text = this._user.get_real_name();
        }

        _bindModeActions() {
            this._settingsApp = Shell.AppSystem.get_default().lookup_app(
                'gnome-user-accounts-panel.desktop');

            if (!this._settingsApp) {
                log('Missing users settings core component, expect trouble…');
            }

            this.accessible_name = this._settingsApp?.get_name() ?? null;

            // Links to the Users settings on click
            this.connect('clicked', () => {
                Main.overview.hide();
                Main.panel.closeQuickSettings();
                this._settingsApp.activate();
            });
        }
    }
);


const Indicator = GObject.registerClass(
    class Indicator extends SystemIndicator {
        _init(settings) {
            super._init();
            this.settings = settings;
            this._load();
        }

        _load() {
            this._avatarItem = new AvatarItem(this.settings);

            // Container of the system toggles
            this.systemItemsBox = QuickSettingsMenu.menu._grid.get_children()[0].get_children()[0];

            if (this.systemItemsBox) {
                this._addAvatar();
            } else {
                const interval = setInterval(() => {
                    this.systemItemsBox = QuickSettingsMenu.menu._grid.get_children()[0].get_children()[0];
                    if (this.systemItemsBox) {
                        clearInterval(interval);
                        this._addAvatar();
                    }
                }, 1000);
            }

            // Destroy the avatar toggle on plugin deactivation
            this.connect('destroy', () => {
                this._avatarItem.destroy();
            });
        }

        _addAvatar() {
            const tmpSystemItems = [];
            this.systemItemsBox.get_children().forEach(item => {
                tmpSystemItems.push({ item, isVisible: item.visible, yAlign: item.get_y_align() });
            });

            this.systemItemsBox.remove_all_children();
            // 0: right, 1: left
            if (this.settings.avatarPosition === 0) {
                this._addSystemItems(tmpSystemItems);
                this.systemItemsBox.add_child(this._avatarItem);
            } else {
                this.systemItemsBox.add_child(this._avatarItem);
                this._addSystemItems(tmpSystemItems);
            }
        }

        _addSystemItems(items) {
            items.forEach(({ item, isVisible }) => {
                item.visible = isVisible;
                // Remove the Y axis expansion on current buttons
                item.set_y_align(Clutter.ActorAlign.CENTER);
                // Battery/Power button doesn't have a fixed height,
                // so it shrinks when specifying y_align to CENTER
                if (item.constructor?.name === 'PowerToggle') {
                    item.set_style('height: 41px;');
                }
                this.systemItemsBox.add_child(item);
            });
        }
    });


export default class QSAvatar extends Extension {
    enable() {
        console.log(`[QSA] Enabling extension`);
        this.settings = this.getSettings('org.gnome.shell.extensions.quick-settings-avatar');
        this.handlerIds = SETTINGS.map(setting => (
            this.settings.connect(`changed::${setting}`, () => {
                this.disable();
                this.enable();
            })
        ));

        this._indicator = new Indicator(this._mapSettings());
    }

    disable() {
        console.log(`[QSA] Disabling extension`);
        this.handlerIds.forEach((handler) => this.settings.disconnect(handler));
        this._indicator.destroy();

        this.handlerIds = null;
        this._indicator = null;
    }

    _mapSettings() {
        return {
            avatarMode: this.settings.get_int('avatar-mode'),
            avatarPosition: this.settings.get_int('avatar-position'),
            avatarSize: this.settings.get_int('avatar-size'),
            avatarRealname: this.settings.get_boolean('avatar-realname'),
            avatarUsername: this.settings.get_boolean('avatar-username'),
            avatarHostname: this.settings.get_boolean('avatar-hostname'),
            avatarNoBackground: this.settings.get_boolean('avatar-nobackground'),
        }
    }
}
