export interface WindowState{ id:string;x:number;y:number;w:number;h:number;lastSeen:number }
export interface Palette{ outer:number;inner:number;third:number;name:string }
export type Msg =
 | {type:"window-update";data:WindowState}
 | {type:"remove-window";id:string}
 | {type:"burst";data:{x:number;y:number;z:number}}
 | {type:"palette";index:number};
