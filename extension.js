const { AccountsService, Clutter, Gio, GLib, GObject, Shell, St } = imports.gi;
const { Avatar, UserWidgetLabel } = imports.ui.userWidget;
const PopupMenu = imports.ui.popupMenu;
const Main = imports.ui.main;
const { QuickSettingsItem, SystemIndicator } = imports.ui.quickSettings;
const QuickSettingsMenu = Main.panel.statusArea.quickSettings;

const SystemActions = imports.misc.systemActions;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();



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
            this._avatarPicture = new Avatar(this._user, {
                iconSize: settings.avatarSize,
                styleClass: 'avatar-picture',
            });
            this._avatarPicture.style = `icon-size: ${settings.avatarSize}px;`;


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
            // if (settings.avatarMode === 0) {
            //     this._bindMinimalActions();
            // }
            // else {
            //     this._bindPopupActions();
            // }

            // Liste to changes when avatar pic or real name is changed via settings
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


        // _bindPopupActions() {
        //     this._systemActions = new SystemActions.getDefault();

        //     this.menu.setHeader('system-shutdown-symbolic', GLib.get_real_name());
        //     this._addUserAction('Log Out…', 'can-logout', this._systemActions.activateLogout);
        //     this._addUserAction('Switch User…', 'can-switch-user', this._systemActions.activateSwitchUser);
        //     this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        //     this.menu.addSettingsAction('User settings', 'gnome-user-accounts-panel.desktop');

        //     this.connect('clicked', () => this.menu.open());
        //     this.connect('popup-menu', () => this.menu.open());
        // }

        // _addUserAction(label, propName, callback) {
        //     const item = this.menu.addAction(label, () => {
        //         callback();
        //         Main.panel.closeQuickSettings();
        //     });
        //     this._systemActions.bind_property(propName, item, 'visible', GObject.BindingFlags.DEFAULT | GObject.BindingFlags.SYNC_CREATE);
        // }
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
            this._indicator = this._addIndicator();
            this._avatarItem = new AvatarItem(this.settings);

            // Container of the system toggles
            this.systemItemsBox = QuickSettingsMenu.menu._grid.get_children()[1].get_children()[0];

            const tmpSystemItems = [];
            const tmpSystemItemsvisible = [];
            const tmpSystemItemsAlign = [];
            this.systemItemsBox.get_children().forEach(item => {
                //log(`[QSA] Found following toggles: ${item.constructor?.name}`);
                tmpSystemItems.push(item);
                tmpSystemItemsvisible.push(item.visible);
                tmpSystemItemsAlign.push(item.get_y_align());

                // Remove the Y axis expansion on current buttons
                item.set_y_align(Clutter.ActorAlign.CENTER);
                // Battery/Power button doesn't have a fixed height,
                // so it shrinks when specifying y_align to CENTER
                if (item.constructor?.name === 'PowerToggle') {
                    item.set_style('height: 41px;');
                }
            });

            // On destroy event, destroy the avatar toggle and reset the system toggles to their default state
            this.connect('destroy', () => {
                this._avatarItem.destroy();
                this.systemItemsBox.get_children().forEach((item, i) => {
                    item.visible = tmpSystemItemsvisible[i];
                    item.set_y_align(tmpSystemItemsAlign[i]);
                });
            });

            // 0: right, 1: left
            if (this.settings.avatarPosition === 0) {
                this.systemItemsBox.add_child(this._avatarItem);
                return;
            }

            // If aligned to left, remove system toggles and re-add them after insertion of avatar menu
            this.systemItemsBox.remove_all_children();
            this.systemItemsBox.add_child(this._avatarItem);

            tmpSystemItems.forEach((item, i) => {
                this.systemItemsBox.add_child(item);
                item.visible = tmpSystemItemsvisible[i];
            });
        }
    });


class Extension {
    constructor() {
        this._indicator = null;
    }

    enable() {
        log(`[QSA] Enabling ${Me.metadata.name}`);
        this.settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.quick-settings-avatar');
        this.handlerIds = SETTINGS.map(setting => (
            this.settings.connect(`changed::${setting}`, () => {
                this.disable();
                this.enable();
            })
        ));

        this._indicator = new Indicator(this._mapSettings());
    }

    disable() {
        log(`[QSA] Disabling ${Me.metadata.name}`);
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


function init() {
    return new Extension();
}
