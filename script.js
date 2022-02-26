const BACKGROUND_COLOR = "#000";

let c = document.createElement("canvas");
c.style = 'position:absolute;top:0;left:0;bottom;0;right:0';
let ctx = c.getContext('2d');

window.onresize = (f=>(f(),f))(_=>{
    c.width = window.innerWidth;
    c.height = window.innerHeight;
})

document.body.appendChild(c);

class Block{
    static NUM_LINES = 5;
    static LINE_WIDTH = .025;
    /** @param {string} color @param {number} height */
    constructor(color, height){
        this.color = color;
        this.height = height;
    }

    draw(ctx, pos, scale){
        const [x, y] = pos;
        ctx.fillStyle = this.color;
        ctx.fillRect(x, y, scale, scale * this.height);
        ctx.fillStyle = BACKGROUND_COLOR + "4";
        for(let i = 1; i < Block.NUM_LINES; i++){
            ctx.fillRect(x + i * Block.LINE_WIDTH * scale, y + i * Block.LINE_WIDTH * scale, scale * (1 - 2 * i * Block.LINE_WIDTH), scale * (this.height - 2 * i * Block.LINE_WIDTH));
        }
        ctx.fillStyle = BACKGROUND_COLOR;
        ctx.fillRect(x + Block.NUM_LINES * Block.LINE_WIDTH * scale, y + Block.NUM_LINES * Block.LINE_WIDTH * scale, scale * (1 - 2 * Block.NUM_LINES * Block.LINE_WIDTH), scale * (this.height - 2 * Block.NUM_LINES * Block.LINE_WIDTH));
        
    }
}

class Stack{
    static MAX_HEIGHT = 5;
    static LINE_WIDTH = .025;
    static NUM_LINES = 5;
    /** @param {Block[]} blocks */
    constructor(...blocks){
        this.blocks = blocks;
    }
    /** @returns {Block} */
    pop(){
        return this.blocks.shift() || null;
    }
    /** @returns {number} */
    get height(){
        return this.blocks.map(i=>i.height).reduce((a,b)=>a + b, 0);
    }
    /** @returns {boolean} */
    get complete(){
        return this.blocks.length < 2 && (this.height == 0 || this.height == Stack.MAX_HEIGHT);
    }
    /** @param {Block} block @returns {boolean} */
    canPush(block){
        return (!this.top || this.top.color == block.color)
            && this.height + block.height <= Stack.MAX_HEIGHT;
    }
    /** @param {Block} block */
    push(block){
        if(!this.top){
            this.blocks.unshift(block);
        }
        else{
            this.top.height += block.height;
        }
    }
    /** @returns {Block} */
    get top(){
        return this.blocks[0] || null;
    }

    /** @param {CanvasRenderingContext2D} ctx @param {[number, number]} pos @param {number} scale */
    draw(ctx, pos, scale, selected){
        //Draw self
        const [x, y] = pos;
        ctx.fillStyle = selected ? "#FFF8" : "#FFF4";
        for(let i = 1; i <= Stack.NUM_LINES; i++){
            ctx.fillRect(x - scale * i * Stack.LINE_WIDTH, y, scale * (1 + i * 2 * Stack.LINE_WIDTH), scale * (Stack.MAX_HEIGHT + i * Stack.LINE_WIDTH));
        }
        ctx.fillStyle = BACKGROUND_COLOR;
        ctx.fillRect(x, y, scale, scale * Stack.MAX_HEIGHT);
        //Draw inner
        let offset = Stack.MAX_HEIGHT - this.height;
        for(let block of this.blocks){
            block.draw(ctx, [x, y + scale * offset], scale);
            offset += block.height;
        }
    }
}

let NUM_STACKS = 10;
let COLORS = [
    "#f08", "#0f0", "#63b", "#ff0", "#0ff", "#f80", 
    "#0a9", "#f00", "#09f", "#e4f", "#00f", "#9ab", "#456",
];

/** @type {Stack[]} */
let stacks = new Array(NUM_STACKS).fill(null);

function reset(){   //Generate level
    let stks = new Array(NUM_STACKS - 1).fill(null).map((_,i)=>new Stack(new Block(COLORS[i], Stack.MAX_HEIGHT))).concat([new Stack()]);

    console.log(stks.map(i=>`Stack(${i.blocks.map(j=>`(${j.color} ${j.height})`).join(', ')})`).join('\n'));

    function bar(){
        let s1 = stks[~~(Math.random() * NUM_STACKS)];
        if(!s1.top) return false;

        let s2 = stks[~~(Math.random() * NUM_STACKS)];
        if(s2.top && s2.top.color == s1.top.color){
            // steps--;
            return false;
        }

        let pushed_height, max_shavable_height;
        max_shavable_height = pushed_height = Math.min(s1.top.height - 1, Stack.MAX_HEIGHT - s2.height);
        if(max_shavable_height <= 0) return false;

        let {color, height} = s1.pop();
        s1.blocks.unshift(new Block(color, height - pushed_height));
        s2.blocks.unshift(new Block(color, pushed_height));

        return true;
    }
    let steps = NUM_STACKS * 50;
    let t = 0;

    while(!bar());
    let f = setInterval(_=>{
        while(!bar()){
            t++;
            if(t > 100) return clearInterval(f);
        }
        steps--;
        t = 0;
        if(steps == 0) clearInterval(f);
    }, 100);

    stacks = stks;
    frame.timeFinished = 0;
}
reset();

/** @type {{block:Block,from:number,to:number,state:{time:number,state:number}}} */
let animating = {block:null,from:null,to:null,state:{time:0,state:0}};
/** @param {Stack} stk1 @param {Stack} stk2 */
function move(i, j){
    let stk1 = stacks[i], stk2 = stacks[j];
    if(i != j && !stk1.complete && stk1.top && stk2.canPush(stk1.top)){
        animating.block = stk1.pop();
        animating.from = i;
        animating.to = j;
        animating.state.time = 0;
        animating.state.state = 1;
    }
}

function foo(x, y){
    let scale = ~~Math.min(window.innerWidth / stacks.length / 2, window.innerHeight / (2 * Stack.MAX_HEIGHT + 3));
    console.log(~~(x / scale - .5));
    if(y >= scale * (Stack.MAX_HEIGHT + 1) && y <= scale * (2 * Stack.MAX_HEIGHT + 1) && (x / scale - .5) % 2 <= 1){
        return ~~((x / scale - .5) / 2);
    }
}

function isFinished(){return stacks.map(i=>i.complete).reduce((a,b)=>a&&b,true)}

let selected = null;
window.onclick = e=>{
    if(isFinished()) return reset();
    if(animating.state.state) return;

    let s = foo(e.clientX, e.clientY);
    if(s === undefined) return;
    if(s >= 0 && s < stacks.length){
        if(selected !== null){
            console.log(`Move: ${selected} -> ${s}`);
            move(selected, s);

            selected = null;
        }
        else selected = s;
    }
}
window.onkeypress = e => {
    if(animating.state.state || isFinished()) return;

    let s = "123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ".indexOf(e.key.toUpperCase());
    if(s >= 0 && s < stacks.length){
        if(selected !== null){
            console.log(`Move: ${selected} -> ${s}`);
            move(selected, s);

            selected = null;
        }
        else selected = s;
    }
}

function frame(){
    let scale = ~~Math.min(window.innerWidth / stacks.length / 2, window.innerHeight / (2 * Stack.MAX_HEIGHT + 3));
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, c.width, c.height);

    for(let i = 0; i < stacks.length; i++){
        stacks[i].draw(ctx, [(1 + 4 * i) * scale / 2, scale * (Stack.MAX_HEIGHT + 1)], scale, i === selected);
        ctx.fillStyle = "#FFF";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `${scale}px sans-serif`;
        ctx.fillText("123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"[i], (1 + 2 * i) * scale, scale * (2 * Stack.MAX_HEIGHT + 2));
    }

    if(animating.state.state){
        let height1 = 1 + 2 * Stack.MAX_HEIGHT - stacks[animating.from].height - animating.block.height;
        let height2 = Stack.MAX_HEIGHT - animating.block.height;
        let height3 = 1 + 2 * Stack.MAX_HEIGHT - stacks[animating.to].height - animating.block.height;

        switch(animating.state.state){
            case 1:
                //Up
                animating.block.draw(
                    ctx,
                    [
                        (1 + 4 * animating.from) * scale / 2,
                        scale * (height1 + (height2 - height1) * animating.state.time)
                    ], scale
                );
                animating.state.time += .3 / (height1 - height2);
                if(animating.state.time >= 1) animating.state.state++, animating.state.time = 0;
                break;
            case 2:
                //Side
                animating.block.draw(
                    ctx,
                    [
                        (1 + 4 * (animating.from + (animating.to - animating.from) * animating.state.time)) * scale / 2,
                        scale * height2
                    ], scale
                );
                animating.state.time += .1 / Math.abs(animating.to - animating.from);
                if(animating.state.time >= 1) animating.state.state++, animating.state.time = 0;
                break;
            case 3:
                //Down
                animating.block.draw(
                    ctx,
                    [
                        (1 + 4 * animating.to) * scale / 2,
                        scale * (height2 + (height3 - height2) * animating.state.time)
                    ], scale
                );
                animating.state.time += .3 / (height3 - height2);
                if(animating.state.time >= 1){
                    stacks[animating.to].push(animating.block);
                    animating.state.state = animating.state.time = 0;
                }
                break;
        }
    }

    if(isFinished()){
        frame.timeFinished ||= 0;
        frame.timeFinished += .1;

        ctx.fillStyle = "#0F04";
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.fillStyle = "#FFF" + "0123456789ABCDEF"[~~Math.min(frame.timeFinished * 15, 15)];
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `${scale * Math.min(frame.timeFinished * 3, 3)}px sans-serif`;
        ctx.fillText("Solved", c.width / 2, c.height / 2);
    }
}

requestAnimationFrame(function f(){frame();requestAnimationFrame(f)});
