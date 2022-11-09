const { AccountsService, Clutter, GLib, GObject, Shell, St } = imports.gi;
const { Avatar } = imports.ui.userWidget;
const Main = imports.ui.main;

const { QuickSettingsItem, SystemIndicator } = imports.ui.quickSettings;
const QuickSettingsMenu = Main.panel.statusArea.quickSettings;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const AvatarItem = GObject.registerClass(
    class AvatarItem extends QuickSettingsItem {
        _init(settings) {
            super._init({
                style_class: 'icon-button avatar-button',
                canFocus: true,
            });

            const userManager = AccountsService.UserManager.get_default();
            const user = userManager.get_user(GLib.get_user_name());

            // Create the avatar thumbnail based on the userWidget Avatar
            const avatar = new Avatar(user, {
                iconSize: 36,
                styleClass: 'user-icon avatar-thumbnail',
            });

            this.set_child(avatar);
            this.set_y_align(Clutter.ActorAlign.CENTER);

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

const SystemItem = GObject.registerClass(
    class SystemItem extends QuickSettingsItem {
        _init(settings) {
            super._init({
                style_class: 'system-item',
                reactive: false,
            });

            this.child = new St.BoxLayout();

            this._avatarItem = new AvatarItem(settings);
            this.child.add_child(this._avatarItem);
        }
    });


const Indicator = GObject.registerClass(
    class Indicator extends SystemIndicator {
        _init(settings) {
            super._init();
            this.settings = settings;
            this._load();
        }

        _load() {
            this._indicator = this._addIndicator();
            this._systemItem = new SystemItem(this.settings);

            this.connect('destroy', () => {
                this._systemItem.destroy();
            });

            this.systemItemsBox = QuickSettingsMenu.menu._grid.get_children()[1].get_children()[0];

            // TODO: modify items' y-align prop if the avatar thumbnail is larger
            // this.systemItemsBox.get_children().forEach(item => {
            //     item.set_y_align(Clutter.ActorAlign.CENTER);
            //     log(`item: ${item.get_children()}`);
            // });

            // If setting to show it on left is disabled, add the avatar on the right
            if (!this.settings.isAvatarOnLeft) {
                this.systemItemsBox.add_child(this._systemItem);
                return;
            }

            const tmpSystemItems = [];
            const tmpSystemItemsvisible = []
            this.systemItemsBox.get_children().forEach(item => {
                tmpSystemItems.push(item);
                tmpSystemItemsvisible.push(item.visible);
            });

            // Remove items to re-add them after insertion of avatar menu
            this.systemItemsBox.remove_all_children();
            this.systemItemsBox.add_child(this._systemItem);

            // Re-add system items
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
        log(`enabling ${Me.metadata.name}`);
        this.settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.quick-settings-avatar');
        this.settingsHandlerId = this.settings.connect("changed::is-avatar-on-left", () => {
            this.disable();
            this.enable();
        });

        const isAvatarOnLeft = this.settings.get_boolean('is-avatar-on-left');
        this._indicator = new Indicator({ isAvatarOnLeft });
    }

    disable() {
        log(`disabling ${Me.metadata.name}`);
        this.settings.disconnect(this.settingsHandlerId);
        this.settingsHandlerId = null;
        this._indicator.destroy();
        this._indicator = null;
    }
}


function init() {
    return new Extension();
}
