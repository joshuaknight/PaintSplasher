
const assetPath = './assets/images/';

class Toolbar {
    constructor(selector) {
        this.selector = selector;
        this.toolbarHeight = '67px';
        this.addToolbar();
        this.listenToToolbarEvents();
    }

    addToolbar() {
        let toolbar = d3.select(this.selector)
            .append('div')
            .attr('id', 'toolbar')
            .style('height', this.toolbarHeight)
            .style('position', 'fixed')
            .style('left', '0px')
            .style('right', '0px')
            .style('top', '0px')
            .style('background-color', 'black')

        toolbar.node().innerHTML =
        `
            <nav>
                <ul>
                    <li>
                        <a class="brush">
                            <span class="icon"></span>
                            Brush
                        </a>
                    </li>
                    <li>
                        <a class="rubber">
                            <span class="icon"></span>
                            Rubber
                        </a>
                    </li>
                    <li>
                        <a class="clearAll">
                            <span class="icon"></span>
                            Clear All
                        </a>
                    </li>
                    <li>
                        <a class="save">
                            <span class="icon"></span>
                            Save as PNG
                        </a>
                    </li>
                </ul>
                <p>
                    Note: Click and start dragging to draw, click again to stop drawing!
                </p>
            </nav>
        `
    }

    listenToToolbarEvents(callback) {
        d3.selectAll('#toolbar li')
            .on('click', callback)
    }
}


class Container extends Toolbar {
    constructor(selector) {
        super(selector);
        this.container = '';
        this.currentMode = 'dark';
        this.BG_COLOR_MODE = {
            'dark' : 'black',
            'light' : '#fff'
        }
        this.setMode();
        this.usingBrush = true;
        this.usingRubber = false;
        this.onWindowResize();
        this.setStylingForContainer();
        this.getContainerFromSelector();
        this.addCursor();
        this.listenToToolbarEvents(() => {
            this.perfromClickAction(d3.event.target.text.trim());
        })
    }

    perfromClickAction(action) {
        switch( action ) {
            case 'Mode': (() => {
                this.currentMode = this.currentMode == 'dark' ? 'light' : 'dark';
                this.setMode();
            })();
            break;
            case 'Save as PNG': this.downloadPng();
            break;
            case 'Brush': (() => { 
                this.usingBrush = true; 
                this.usingRubber = false; 
            })();
            break;
            case 'Rubber': (() => {
                this.usingBrush = false;
                this.usingRubber = true;
            })();
            break;
            case 'Clear All': this.container.selectAll('path').remove();
            break;
        }
    }

    setMode() {
        d3.select(this.selector).attr('class',this.currentMode)
    }

    downloadPng() {
        var canvas = document.createElement('canvas');
        canvas.style.backgroundColor = this.currentMode == 'dark' ? 'black' : '#fff';
        canvas.width = parseInt(this.container.style('width').replace("px",""));
        canvas.height = parseInt(this.container.style('height').replace("px",""));
        var data = new XMLSerializer().serializeToString(this.container.node());
        var win = window.URL || window.webkitURL || window;
        var img = new Image();
        var blob = new Blob([data], { type: 'image/svg+xml' });
        var url = win.createObjectURL(blob);
        var image = new Image();                     
        img.onload = function () {
            const context = canvas.getContext('2d');
            context.globalCompositeOperation="destination-over";
            context.drawImage(img, 0, 0);
            win.revokeObjectURL(url);
            var uri = canvas.toDataURL('image/png').replace('image/png', 'octet/stream');
            var a = document.createElement('a');
            document.body.appendChild(a);
            a.style = 'display: none';
            a.href = uri
            a.download = 'img.png';
            a.click();
            window.URL.revokeObjectURL(uri);
            document.body.removeChild(a);
        };
        img.src = url;
    }

    onWindowResize() {
        addEventListener('resize', () => {
            this.setWidthHeight();
        });
    }

    setStylingForContainer() {
        this.container = d3.select(this.selector)
                            .style('margin-top', this.toolbarHeight)
                            .style('width', '100%')
                            .style('height', '100%')
                            .style('position','relative')
                            .style('cursor','none')
    }

    getContainerFromSelector() {
        this.container = this.container.append('svg')
        this.setWidthHeight();
    }

    setWidthHeight() {
        const rect = d3.select(this.selector)
                        .node()
                        .getBoundingClientRect();
        this.container
            .style('width', rect.width + 'px')
            .style('height', rect.height + 'px')
    }

    addCursor() {
        d3.select(this.selector)
            .append('div')
            .attr('id','cursor')
            .style('position','absolute')
            .style('z-index', 999)
            .style('background-image',`url('${assetPath}/brush.svg')`)
            .style('background-repeat',"no-repeat")
            .style('width','30px')
            .style('height','30px')
    }

    showCursorOnMouseMove(pageX, pageY) {
        d3.select('#cursor')
            .style('left',pageX + 'px')
            .style('top',pageY + 'px')
            .style('background-image', () => {
                return this.usingRubber ? `url('${assetPath}/rubber-icon.svg')` : `url('${assetPath}/brush.svg')`;
            })
            .transition()
            .style('display','block')
    }
}

class Splash extends Container {
    constructor(selector) {
        super(selector);
        this.drawEnabled = false;
        this.colorPalate = ['#0075DF', '#FEDC01', '#FF501B', '#8721E1'];
        this.toggleListener();
        this.onMouseMove();
    }

    toggleListener() {
        this.container.on('click' , () => { this.drawEnabled = !this.drawEnabled; })
    }

    onMouseMove() {
        this.container.on('mousemove', () => {
            if ( !d3.event ) { return; }
            const pageX = d3.event.pageX;
            const pageY = d3.event.pageY;
            if ( !pageX || !pageY ) { return; }
            this.showCursorOnMouseMove(pageX, pageY);
            if ( !this.drawEnabled ) { return; }
            const spiral = Array.from({ length: Math.random() * 100 }, (_, i) => [
                (Math.random() / 4) * i, // angle (in radians)
                (Math.random() * i) // radius
            ])
            
            let path = this.container
                .append('path')
                .attr('transform',`translate(${pageX},${pageY})`)
                .attr('d', d3.areaRadial()(spiral))
                .attr('fill' , () => {
                    this.randomColor = Math.round( (Math.random() * 100) % ( this.colorPalate.length - 1 ) );
                    return this.usingRubber ? this.BG_COLOR_MODE[this.currentMode] : this.colorPalate[this.randomColor];
                })
                .attr('stroke', 'none');

            var totalLength = path.node().getTotalLength();
            path
                .attr("stroke-dasharray", totalLength + " " + totalLength)
                .attr("stroke-dashoffset", totalLength)
                .transition()
                .delay(100)
                .duration(500)
                .ease(d3.easeBounce)
                .attr("stroke-dashoffset", 0)
        })
    }
}