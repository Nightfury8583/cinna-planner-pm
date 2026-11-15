import components from './components.json';
import weapons from './weapons.json';
import accessories from './accessories.json';
import shops from './shops.json';
import constants from './constants.json';

// Keyed by id, like UnitMap / ClassMap in the Fire Emblem data.
export const ComponentMap = components;
export const WeaponMap = weapons;
export const AccessoryMap = accessories;
export const ShopMap = shops;
export const Constants = constants;

// Weapons and accessories share the same upgrade fields and never share an id, so one map covers both.
// Use item.kind ("weapon" | "accessory") to tell them apart.
export const ItemMap = {...weapons, ...accessories};

export const ComponentList = Object.values(components);
export const WeaponList = Object.values(weapons);
export const AccessoryList = Object.values(accessories);
export const ItemList = Object.values(ItemMap);

// itemId -> every place it can be bought: [{shop, shopName, price, chapter, note}]
export const OffersByItem = {};
Object.values(shops).forEach((shop) => {
    shop.stock.forEach((entry) => {
        (OffersByItem[entry.itemId] ||= []).push({
            shop: shop.id,
            shopName: shop.name,
            price: entry.price,
            chapter: entry.chapter,
            note: entry.note,
        });
    });
});
