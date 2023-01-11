"use strict";

if (figma.editorType === 'figma') {
    figma.showUI(__html__, { width: 150, height: 200, title: "px_check" });
    figma.ui.onmessage = msg => {
        console.log(figma.currentPage.selection[0])

    if (figma.currentPage.selection.length == 0) { // 選択なし　→ msg："not selected"　を返す　ーーーーーーーーーー
        figma.ui.postMessage({ type: "result", body: "not selected" })
    }
    else {
        if (msg.type === 'count') {        // 実行　文字数カウント ーーーーーーーーーー
            console.log('count始めます')
            console.log(figma.currentPage.selection[0])
            let node_count = 0
            let node_total = 0
            let result = ['要素:文字数']
            let result_last = []
            for (let node of figma.currentPage.selection) {
                let node_name = node.name
                let kaisou_word_count = (node) => {
                    if (node.type == 'TEXT') {
                        node_count += node.characters.length
                        node_total += node.characters.length}
                    else if(node.type == 'GROUP'|| node.type == 'FRAME'|| node.type == 'INSTANCE'){
                        for(let child of node.children) {
                            kaisou_word_count(child)
                        }
                    }
                }
                kaisou_word_count(node)
                result.push((node.name)+ ' : '+ (node_count))
                node_count = 0
            }
            if (figma.currentPage.selection.length == 1) {
                result_last.push(result)
                figma.ui.postMessage({ type: "result", body: result_last });
            }
            else{
                result.push('total : '+ (node_total))
                result_last.push('total : '+ (node_total))
            }
            let kaigyou = result.join('\n')
            console.log(result)
            console.log(kaigyou)
            figma.ui.postMessage({ type: "note", body: [kaigyou,''] });
            figma.ui.postMessage({ type: "result", body: result_last });
        }
        if (msg.type === 'reverse') {      // 実行　逆転  ーーーーーーーーーー
            // ーーーーーーーーーー選択数１かつpage直下のフレームは実行不可
            if (figma.currentPage.selection.length == 1 && figma.currentPage.selection[0].parent.type == 'PAGE') {
                console.log('親フレームごとなくなってしまうので、順逆にしたいframe群を選択するか、frame群をさらに不要なframeでまとめたものを選択ください')
                figma.ui.postMessage({ type: "result", body: "親frameごとなくなってしまうので、順逆にしたいframe群を選択するか、frame群をさらに不要なframeでまとめたものを選択ください" })
            }
            // ーーーーーーーーーー選択数１かつ２層目以降にあるフレーム
            else if (figma.currentPage.selection.length == 1 && figma.currentPage.selection[0].parent.type != 'PAGE') {
                console.log(figma.currentPage.selection[0])
                let select = []
                let rev_nodes = []
                let parent = figma.currentPage.selection[0];
                let grand_parent = figma.currentPage.selection[0].parent;
                let newGroup = figma.group(figma.currentPage.selection[0].children, grand_parent)
                // ーー新グループの要素を下段からリスト化　＆　個別に仮グループ化
                for (let child of newGroup.children) {
                    rev_nodes.unshift(child); // chidrenの　順序逆リスト（下段から順になる）
                }
                for (let rev_child of rev_nodes) { // 下段から順にグループ化し、グループ解除（rectはグループ化のダミーとして必要）
                    let rect = figma.createRectangle();
                    let secondGroup = figma.group([rect,rev_child], newGroup)
                    figma.ungroup(secondGroup)
                    rect.remove()
                }
                // ーー新グループを解除して大元のフレームorグループを削除
                figma.ungroup(newGroup)
                let remove_name = [parent.parent.parent.name + '>' + parent.parent.name + '>' + parent.name,'']
                let result = ['削除数: 1', remove_name]
                figma.ui.postMessage({ type: "result", body: "reversed! -親要素は削除されました" })
                figma.ui.postMessage({ type: "note", body: result })
                if(parent.type == 'FRAME') {
                    parent.remove()
                }
                figma.currentPage.selection = rev_nodes;
            } 
            // ーーーーーーーーーー複数のフレームの場合（推奨）
            else if (figma.currentPage.selection.length > 1 ){ 
                let rev_nodes = []
                let parent = figma.currentPage.selection[0].parent;
                let newGroup = figma.group(figma.currentPage.selection, parent)
                // ーー要素を下段からリスト化　＆　個別に仮グループ化
                for (let child of newGroup.children) {
                    rev_nodes.unshift(child); // chidrenの　順序逆リスト（下段から順になる）
                }
                for (let rev_child of rev_nodes) { // 下段から順にグループ化し、グループ解除（rectはグループ化のダミーとして必要）
                    let rect = figma.createRectangle();
                    let secondGroup = figma.group([rect,rev_child], newGroup)
                    figma.ungroup(secondGroup)
                    rect.remove()
                }
                figma.ungroup(newGroup)
                figma.ui.postMessage({ type: "result", body: "reversed!" })
            }
            // ーーーーーーーーーーーメモーーーーーーーーーーー
            // ブラウザ上で「１」「２」「３」のグループが並んでいる時、
            // for文で要素を取り出す際は『id順（生成した順番）』なので予測できない
            // parentのchildrenとしてfor文に入れるとOK↓
            //  for (let node of figma.currentPage.selection) {
            //     for (let child of node.children) {　　→「３」「２」「１」ーと、下段から順番になる（idは関係なく）
        }
        if (msg.type === 'small_letter') { // 実行　小文字に変換 ーーーーーーーーーー
            console.log('small_letter始めます')
            let node_name = []
            function fullWidth2HalfWidth(src) {
                return src.replace(/[Ａ-Ｚａ-ｚ０-９]/g, function(s) {
                  return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
                });
              }
            // ーーレイヤーを順に調整
            for (let node of figma.currentPage.selection) {
                node_name = node.name;
                node_name = fullWidth2HalfWidth(node_name)
                node_name = node_name.toLowerCase();
                
                let node_num = node_name.replace(/[^0-9]/g, "");
                node_name = node_name.replace(/ /g, '') //正規表現で「/_/g」のように対象文字を指定すれば、すべての対象文字を置換することが可能です。
                node_name = node_name.replace(/　/g, '')
                node_name = node_name.replace(/-/g, '_')
                if (node_num.length  == 1) {// 一桁の数字の場合ゼロを足し　０１、０２、にする
                    node_name = node_name.replace(node_num, ('' + '0' + node_num))
                }
                node.name = node_name
            }
            figma.ui.postMessage({ type: "result", body: "done!" })
            
        }
        if (msg.type === 'rename') { // 実行　小文字に変換 ーーーーーーーーーー
            console.log('rename始めます')
            
            console.log(msg.x_name)
            
        }
        if (msg.type === 'create-shapes') {// 実行　px_check  ーーーーーーーーーー

            // ーーーーーーーーーー砂場
            // if (node.type == "TEXT") {
            //     console.log(node.characters)
            //     console.log(node.fontSize)
            //     console.log(node.lineHeight.value)
            //     console.log('text desita ne')
            // }
            console.log('砂場おしまい')
            // ーーーーーーーーーー砂場  

         // ーーーーーーーーーー  実行　px_Round と invisible_Delete(非表示削除)     
                if (msg.px_Round == 'true' || msg.invisible_Delete == 'true') {
                    console.log(' px_Round と invisible_Delete 始めます')
                    for (let node of figma.currentPage.selection) {
                        const remove_all = []
                        // ■■■■■■関数:visibleと整数化■■■■■■ 非表示( visible: false )は削除 & widthかheightが四捨五入して０になるものは削除
                        let pxAlign = (node) => {
                            if (msg.invisible_Delete == 'true' && node.visible != true && node.name !== 'SP_ガイド' && node.name !== 'PC_ガイド') {
                                remove_all.push(node.parent.parent.name + '>' + node.parent.name + '>' + node.name)
                                node.remove()
                                figma.ui.postMessage({ type: "result", body: "cleaned!" })
                            }
                            else if (msg.px_Round == 'true' && node.type !== 'LINE' && (Math.round(node.width) == 0 || Math.round(node.height) == 0)) {
                                node.remove()
                            }
                            else {
                                if (msg.px_Round == 'true') {
                                    if (node.type == 'LINE') {
                                        node.x = Math.round(node.relativeTransform[0][2])
                                        node.y = Math.round(node.relativeTransform[1][2])
                                    } else {
                                        console.log(node.name + '整数化したよ')
                                        node.x = Math.round(node.relativeTransform[0][2])
                                        node.y = Math.round(node.relativeTransform[1][2])
                                        node.resize(Math.round(node.width), Math.round(node.height))
                                        if (Math.abs(node.rotation) < 1) {
                                            node.rotation = Math.round(node.rotation)
                                        }
                                    }
                                }
                                //再帰させる　logo、iconは深掘りせず無視する
                                if (node.name.includes('icon') || node.name.includes('logo')) {
                                } else {
                                    if (node.type == 'GROUP' || node.type == 'FRAME' || node.type == 'INSTANCE') {
                                        for (let child of node.children) {
                                            pxAlign(child);
                                        }
                                    }
                                }
                            }
                        }

                        pxAlign(node);

                        if (remove_all.length > 0) {
                            let result = ['削除数：' + remove_all.length, remove_all]
                            figma.ui.postMessage({ type: "result", body: 'done!' })
                            figma.ui.postMessage({ type: "note", body: result })
                            figma.notify('削除数：' + remove_all.length)
                        } else if (remove_all.length == 0) {
                            figma.ui.postMessage({ type: "result", body: 'done!' })
                        }

                    }
                }
         // ーーーーーーーーーーpx_Check  
                if (msg.px_Check == 'true') {
                    console.log('px_Check始めます')
                    let rect_all = []
                    let line_all = []
                    let rect_count = 0
                    let line_count = 0
                    let two_layer_ys = []
                    let two_layer_allys = []
                    let abs_top = [];
                    let abs_bottom = [];
                    let abs_top_numbers = [];
                    let abs_bottom_numbers = [];
                    let set_ys = [];
                    let list_ys = [];

                    for (let node of figma.currentPage.selection) {
                        console.log(node.name+ ' ')
                        console.log(node)
                     // ーーーーーーーー1層目と２層目のフレームの　「重なり」＆「空き」　をチェック
                        if (node.visible != false && node.name != 'SP_ガイド' && node.name != 'PC_ガイド' && node.rotation == 0) {
                             // ーーーーーーーー1層目と２層目の整数化
                            if (node.name.includes('icon') || node.name.includes('logo')) {
                            }
                            else {
                                if (node.type == 'GROUP' || node.type == 'FRAME' || node.type == 'INSTANCE') {
                                    console.log(node.name + '整数化')
                                    node.x = Math.round(node.relativeTransform[0][2])
                                    node.y = Math.round(node.relativeTransform[1][2])
                                    node.resize(Math.round(node.width), Math.round(node.height))
                                    if (Math.abs(node.rotation) < 1) {
                                        node.rotation = Math.round(node.rotation)
                                    }
                                    for (let child of node.children) { //もう一層深掘り　logo、iconは深掘りせず無視する
                                        if (child.type == 'GROUP' || child.type == 'FRAME' || child.type == 'INSTANCE') {
                                            console.log(child.name + '整数化')
                                            child.x = Math.round(child.relativeTransform[0][2])
                                            child.y = Math.round(child.relativeTransform[1][2])
                                            child.resize(Math.round(child.width), Math.round(child.height))
                                            if (Math.abs(child.rotation) < 1) {
                                                child.rotation = Math.round(child.rotation)
                                            }
                                        }
                                    }
                                }
                            }
                            console.log('整数化できました')


                            let parent_x = node.absoluteBoundingBox.x
                            let parent_w = node.absoluteBoundingBox.width
                            let Ay = node.absoluteBoundingBox.y
                            let By = node.absoluteBoundingBox.y + node.height
                            two_layer_ys.push(Ay, By)
                            two_layer_allys.push([node.id, Ay, By,node.name])
                            // ■■■■■■line作成関数■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
                            let makeLine = (name, top_y, bottom_y) => {
                                console.log('line作ります' + name + '+' + top_y + '+' + bottom_y + '幅は' + (bottom_y - top_y))
                                const line = figma.createLine();
                                line.x = parent_x - 50
                                line.resize(Math.abs(bottom_y - top_y), 0)
                                line.name = name
                                if (bottom_y < top_y) {
                                    line.y = bottom_y
                                } else {
                                    line.y = top_y
                                }
                                line.rotation = -90
                                line.opacity = 0.5
                                line.strokes = [{ type: "SOLID", blendMode: 'MULTIPLY', color: { r: 1, g: 0, b: 0 } }];
                                line.strokeWeight = 50
                                line_count += 1
                                line_all.push(line)
                            };
                            // ■■■■■■rect作成関数■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
                            let makeRect = (child, device = 0, wei = 8.0, x = parent_x, y = child.absoluteBoundingBox.y ) => {
                                const rect = figma.createRectangle();
                                rect.x = x + device - 50;
                                rect.y = y - 50
                                rect.name = 'px:' + child.parent.parent.name + ' > ' + child.parent.name + ' > ' + child.name
                                rect.fills = []
                                rect.opacity = 0.5
                                rect.strokes = [{ type: "SOLID", blendMode: 'MULTIPLY', color: { r: 1, g: 0, b: 0 } }];
                                rect.strokeWeight = wei
                                rect_count += 1
                                rect_all.push(rect)
                                console.log(rect.name)
                                console.log('ｒｅｃｔ作成しました')
                                console.log(x)
                                console.log(rect.x)
                            };

                            // 縦の２階層分までのy座標を取得　 & 　x座標のズレをチェック
                            if (node.type == "FRAME" || node.type == "INSTANCE" || node.type == "GROUP") {
                                for (let child of node.children) {
                                    if (child.visible != false && child.name != 'SP_ガイド' && child.name != 'PC_ガイド' && child.rotation == 0) {
                                        if (child.type == "FRAME" || child.type == "INSTANCE" || child.type == "GROUP") {
                                            let childAy = child.absoluteBoundingBox.y
                                            let childBy = child.absoluteBoundingBox.y + child.height
                                            let childAx = child.absoluteBoundingBox.x
                                            let childBx = child.absoluteBoundingBox.x + child.width
                                            two_layer_ys.push(childAy, childBy)
                                            // two_layer_allys：　主人ID　　　A＝上側のy　B＝下側のy　　主人名
                                            two_layer_allys.push([child.id, childAy, childBy, child.name])
                                            if (0 < Math.abs(childAx - parent_x)) {
                                                makeRect(child, 0, 24.0)
                                                console.log('1ー2層目のAx１')
                                            }
                                            if (0 < Math.abs((parent_x + parent_w) - childBx)) {
                                                makeRect(child, child.width, 24.0)
                                                console.log('1ー2層目のBx２')
                                            }
                                        }
                                    }
                                }
                                // ysの整理セット化
                                set_ys = new Set(two_layer_ys);
                                list_ys = [...set_ys];
                            }
                          

                            //  １〜２層目までのフレームのy座標について、pxズレをチェック　→lineで表示
                            for (let i of two_layer_allys) {
                                
                                console.log('主人公iは')
                                console.log(i[3])
                                // iとそれ以外とを突合させて、y座標差分の絶対値をリスト化
                                for (let A of two_layer_allys) {// two_layer_allys：　0 主人ID　　　1 A＝上側のy　2 B＝下側のy　　3 主人名
                                    if (i[0] == A[0]) {}
                                    else{
                                        if (i[0] == two_layer_allys[0][0]) {
                                        abs_top.push([i[0], A[0], Math.abs(i[1] - A[1]), i[1], A[1]])
                                        abs_top_numbers.push(Math.abs(i[1] - A[1]))
                                        abs_bottom.push([i[0], A[0], Math.abs(i[2] - A[2]), i[2], A[2]])
                                        abs_bottom_numbers.push(Math.abs(i[2] - A[2]))
                                        }else {
                                            if ( A[1] < i[1] && A[2] < i[2]){
                                                // abs_top　主人ID 相手ID　Aと相手のBの絶対値　　　比べた数どうし　
                                                abs_top.push([i[0], A[0], Math.abs(i[1] - A[2]), i[1], A[2]])
                                                abs_top_numbers.push(Math.abs(i[1] - A[2]))
                                            }else{
                                            }
                                        }
                                    }
                                }
                                // 絶対値のリストから最小値を出す
                                let abs_top_min = Math.min(...abs_top_numbers)
                                let abs_bottom_min = Math.min(...abs_bottom_numbers)
                                let result = abs_top_numbers.findIndex(element => element == abs_top_min)
                                let result_bottom = abs_bottom_numbers.findIndex(element => element == abs_bottom_min)
                                 // ０以上ならlineを作成　
                                if (abs_bottom_min > 0 && result_bottom >= 0){
                                    console.log('■■■■■■■■■■■■bottom検知')// two_layer_allys：　0 主人ID　　　1 A＝上側のy　2 B＝下側のy　　3 主人名
                                    makeLine(two_layer_allys[result_bottom][3] + '/' + abs_bottom[result_bottom][1], abs_bottom[result_bottom][3], abs_bottom[result_bottom][4])
                                    console.log('作成しました_bottom検知')
                                }
                                if (abs_top_min > 0 && result >= 0){
                                    console.log('■■■■■■■■■■■■top検知')// abs_top　0 主人ID 1 相手ID　2 Aと相手のBの絶対値　　　3 比べた数どうし　4比べた数どうし
                                    console.log(two_layer_allys)

                                    makeLine(two_layer_allys[result][3] + '/' + abs_top[result][1], abs_top[result][3], abs_top[result][4])
                                    console.log('作成しました')
                                }else{
                                    console.log(i[3]+' はline作らなくてよし')
                                }
                                // リストの初期化
                                abs_top = [];
                                abs_top_numbers = [];
                                abs_top_min = [];
                                abs_bottom = [];
                                abs_bottom_numbers = [];
                                abs_bottom_min = [];
                            }

                            //  選択レイヤーを深掘りし、pxズレのチェック　→rectで表示
                            if (node.type == "FRAME" || node.type == "INSTANCE" || node.type == "GROUP") {
                            // ■■■■■■関数　階層を掘る＆縦横のチェック■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
                                let kaisouCheck = (node) => {
                                    // グループ以外
                                    console.log(node.name+ '  始まり 215 let kaisouCheck = (node)')

                                    if (node.type != "GROUP") {
                                        let node_x = node.absoluteBoundingBox.x
                                        let node_y = node.absoluteBoundingBox.y
                                        let node_w = node.absoluteBoundingBox.width
                                        let node_h = node.absoluteBoundingBox.height
                                        console.log(node.name+ '  グループでないならペアレントと比較')
                                        console.log(node_x+ '　'+parent_x+ '　'+parent_w+ '　'+node_w+ '　' )
                                        // nodeの横を２層分とチェック
                                        if (0 < (node_x - parent_x) && (node_x - parent_x) <= msg.x_count) {
                                            makeRect(node, 0, 24.0, parent_x, node_y)
                                            console.log('nodeの横を１')
                                        }
                                        if (0 < ((parent_x + parent_w) - (node_x + node_w)) && ((parent_x + parent_w) - (node_x + node_w)) <= msg.x_count) {
                                            makeRect(node, parent_w, 24.0, parent_x, node_y)
                                            console.log('nodeの横を２')
                                        }
                                        // nodeのタテを２層分とチェック
                                        for (let t of list_ys) {
                                            if (0 < Math.abs(t - node_y) && Math.abs(t - node_y) <= msg.y_count) {
                                                makeRect(node, 0, 24.0, parent_x, t)
                                                console.log('nodeの横を３')
                                            }
                                            if (0 < Math.abs(t - (node_y + node_h)) && Math.abs(t - (node_y + node_h)) <= msg.y_count) {
                                                makeRect(node, 0, 24.0, parent_x, t)
                                                console.log('nodeの横を４')
                                            }
                                        }
                                        // nodeのchidlenをチェック
                                        for (let child of node.children) {
                                            // １　グループやベクターでないなら以下照合
                                            if ((child.type != "GROUP" && child.visible != false && child.name != 'SP_ガイド' && child.name != 'PC_ガイド' && child.rotation == 0)) {
                                                if (child.visible != false && child.type != 'TEXT') {
                                                    let child_x = child.absoluteBoundingBox.x
                                                    let child_y = child.absoluteBoundingBox.y
                                                    let child_w = child.absoluteBoundingBox.width
                                                    let child_h = child.absoluteBoundingBox.height
                                                    // console.log('0 < '+(child_y - node_y)+' <= '+msg.y_count)
                                                    // childの横を２層分と照合してチェック
                                                    console.log('子の名称')
                                                    console.log(child)
                                                    console.log(child_x+' '+child_y+' '+child_w+' '+child_h)
                                                    console.log('node x,y,w,h')
                                                    console.log(node_x+' '+node_y+' '+node_w+' '+node_h)
                                                    console.log('2階層分のリスト　　list_ys')
                                                    console.log(list_ys)
                                                    if (0 < (child_x - node_x) && (child_x - node_x) <= msg.x_count) {
                                                        makeRect(child, 0, 8.0, child_x, child_y)}
                                                    if (0 < ((node_x + node_w) - (child_x + child_w)) && ((node_x + node_w) - (child_x + child_w)) <= msg.x_count) {
                                                        makeRect(child, 0, 8.0, (child_x + child_w), child_y)
                                                    }
                                                        // // parent大元の要素とチェック
                                                        // if (0 < (child_x - node_x) && (child_x - node_x) <= msg.x_count) {
                                                        //     makeRect(child, 0, 8.0, parent_x, child_y)}
                                                        // if (0 < ((node_x + node_w) - (child_x + child_w)) && ((node_x + node_w) - (child_x + child_w)) <= msg.x_count) {
                                                        //     makeRect(child, parent_w, 8.0, parent_x, child_y)}
                                                    // childのタテを２層分とチェック
                                                    if (0 < (child_y - node_y) && (child_y - node_y) <= msg.y_count) {
                                                        makeRect(child, 0, 8.0, child_x, child_y)
                                                    }
                                                    if (0 < ((node_y + node_h) - (child_y + child_h)) && ((node_y + node_h) - (child_y + child_h)) <= msg.y_count) {
                                                        makeRect(child, 0, 8.0, child_x, (child_y + child_h))
                                                    }
                                                };
                                            }
                                            // 2　マスクの場合
                                            if (child.isMask == true) {
                                                let mask_x = child.absoluteBoundingBox.x
                                                let mask_y = child.absoluteBoundingBox.y
                                                let mask_w = child.absoluteBoundingBox.width
                                                let mask_h = child.absoluteBoundingBox.height
                                                for (let masked of node.children) {
                                                    if (masked.rotation == 0 && child.type != "GROUP") {
                                                        let masked_x = masked.absoluteBoundingBox.x
                                                        let masked_y = masked.absoluteBoundingBox.y
                                                        let masked_w = masked.absoluteBoundingBox.width
                                                        let masked_h = masked.absoluteBoundingBox.height
                                                        // childの横を２層分と照合してチェック
                                                        if (0 < (masked_x - mask_x) && (masked_x - mask_x) <= msg.x_count) {
                                                            makeRect(masked, 0, 8.0, mask_x, masked_y)
                                                            console.log('mask da1')
                                                        }
                                                        if (0 < ((mask_x + mask_w) - (masked_x + masked_w)) && ((mask_x + mask_w) - (masked_x + masked_w)) <= msg.x_count) {
                                                            makeRect(masked, 0, 8.0,(masked_x + masked_w), masked_y)
                                                            console.log('mask da2')
                                                        }
                                                        // childのタテを２層分とチェック
                                                        if (0 < (masked_y - mask_y) && (masked_y - mask_y) <= msg.y_count) {
                                                            makeRect(masked, 0, 8.0, mask_x, masked_y)
                                                            console.log('mask da3')
                                                        }
                                                        if (0 < ((mask_y + mask_h) - (masked_y + masked_h)) && ((mask_y + mask_h) - (masked_y + masked_h)) <= msg.y_count) {
                                                            makeRect(masked, 0, 8.0, mask_x, (masked_y + masked_h))
                                                            console.log('mask da4')
                                                        }
                                                    }
                                                }
                                            }
                                            // 3　グループやフレームなら深堀り、非表示(visible: false)はスルー対象
                                            if (child.visible == false) {
                                            }
                                            else if ((child.type == "FRAME" || child.type == "INSTANCE" || child.type == "GROUP") && child.name != 'SP_ガイド' && child.name != 'PC_ガイド') {
                                                console.log('f深堀り対象 :' + child.name)
                                                kaisouCheck(child);
                                            }
                                        }
                                    }
                                    // グループの場合
                                    if (node.type == "GROUP") {
                                        for (let child of node.children) {
                                            // G１　グループでないなら以下照合
                                            if ((child.type != "GROUP" && child.visible != false && child.name != 'SP_ガイド' && child.name != 'PC_ガイド' && child.rotation == 0)) {
                                                if (child.visible != false && child.type != 'TEXT') {
                                                    // console.log(child.name + 'へは何もしない')
                                                };
                                            }
                                            // G2　マスクの場合
                                            if (child.isMask == true) {
                                                // console.log('マスクきました'+ child.name)
                                                let mask_x = child.absoluteBoundingBox.x
                                                let mask_y = child.absoluteBoundingBox.y
                                                let mask_w = child.absoluteBoundingBox.width
                                                let mask_h = child.absoluteBoundingBox.height
                                                for (let masked of node.children) {
    
                                                    if (masked.rotation == 0 && masked.type != "GROUP") {
                                                        let masked_x = masked.absoluteBoundingBox.x
                                                        let masked_y = masked.absoluteBoundingBox.y
                                                        let masked_w = masked.absoluteBoundingBox.width
                                                        let masked_h = masked.absoluteBoundingBox.height
                                                        // console.log(mask_x +'-'+ mask_y+'-'+ mask_w +'-'+ mask_h )
                                                        // console.log(masked_x +'-'+ masked_y+'-'+ masked_w +'-'+ masked_h )
                                                        // console.log(masked)
    
                                                        // childの横を２層分と照合してチェック
                                                        if (0 < (masked_x - mask_x) && (masked_x - mask_x) <= msg.x_count) {
                                                            makeRect(masked, 0, 8.0, mask_x, mask_y)
                                                            console.log(masked)
                                                            console.log('■■■mask G1')
                                                        }
                                                        if (0 < ((mask_x + mask_w) - (masked_x + masked_w)) && ((mask_x + mask_w) - (masked_x + masked_w)) <= msg.x_count) {
                                                            makeRect(masked, 0, 8.0, (mask_x + mask_w), mask_y)
                                                            console.log(masked.type)
                                                            console.log('■■■mask G2')
                                                        }
                                                        // childのタテを２層分とチェック
                                                        if (0 < (masked_y - mask_y) && (masked_y - mask_y) <= msg.y_count) {
                                                            makeRect(masked, 0, 8.0, mask_x, mask_y)
                                                            console.log(masked)
                                                            console.log('■■■mask G3')
                                                        }
                                                        if (0 < ((mask_y + mask_h) - (masked_y + masked_h)) && ((mask_y + mask_h) - (masked_y + masked_h)) <= msg.y_count) {
                                                            makeRect(masked, 0, 8.0, mask_x, (mask_y + mask_h))
                                                            console.log(masked)
                                                            console.log('0 < ' + ((mask_y + mask_h) - (masked_y + masked_h)) + '<=' + msg.y_count)
                                                            console.log('■■■mask G4')
                                                        }
                                                    }
    
                                                }
                                            }
                                            // G3　グループやフレームなら深堀り、非表示はスルー対象
                                            if (child.visible == false) {
                                            }
                                            else if ((child.type == "FRAME" || child.type == "INSTANCE" || child.type == "GROUP") && child.name != 'SP_ガイド' && child.name != 'PC_ガイド') {
                                                kaisouCheck(child);
                                            }
                                        }
                                    }
                                }
                                kaisouCheck(node)
                            }
                                // 作成した line & rect の数次第でメッセージを送る
                            if (line_count == 0 && rect_count == 0) {
                                figma.ui.postMessage({ type: "result", body: "perfect!!" })
                            } 
                            // 作成した line & rect を格納してメッセージを送る
                            else {
                                const frame = figma.createFrame()
                                frame.x = parent_x - 50
                                frame.y = Ay - 50
                                frame.resize(parent_w + 100, 100)
                                frame.clipsContent = false
                                frame.name = 'px_check'
                                frame.fills = []
                                frame.opacity = 0.7
                                const merged = [ ...line_all, ...rect_all]
                                figma.currentPage.selection = merged;
                                const newGroup = figma.group(figma.currentPage.selection, frame)
                                figma.ungroup(newGroup)

                                figma.ui.postMessage({ type: "result", body: "done!" })
                                // figma.viewport.scrollAndZoomIntoView(rect_all,{zoom:0.3});
                            }
                        }
                        
                    }
                }
            console.log('oshimai')
        }
    
    }
}}