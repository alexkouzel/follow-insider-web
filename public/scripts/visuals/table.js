import { Loader } from '/scripts/visuals/loader.js';

/* props: align */
export class Table {
    constructor(columns, props) {
        this.columns = columns;

        // init props
        props.align = props.align ?? Array(columns.length).fill('start');
        props.pageSize = props.pageSize ?? 10;
        props.rangeSize = props.rangeSize ?? 10;
        this.props = props;

        // init state
        this.currPage = 0;
        this.currRange = 0;
        this.counter = 0;

        // build table tag
        this.tag = this._build();
        this.wrapperTag = this.tag.querySelector('.table-wrapper');

        // add loader between pages
        this.loader = new Loader(this.wrapperTag);

        // load the total number of rows
        props.loadCount().then(rowCount => {

            if (rowCount == 0) {
                this.onEmpty();
                return;
            }

            this.rowCount = rowCount;
            this.currPageSize = Math.min(this.props.pageSize, this.rowCount);
            this.pageCount = Math.ceil(this.rowCount / props.pageSize);
            this.rangeCount = Math.ceil(this.pageCount / props.rangeSize);

            // add navigation
            this.tag.appendChild(this._buildNav());

            // load first page
            this._loadPage();
        });
    }

    _loadPage() {
        this.clear();

        this.counter++;
        let idx = this.counter;

        this.future = new Promise(async (resolve, _) => {
            let page = await this.props.loadPage(this.currPage);
            resolve([idx, page]);
        });

        this.future
            .then(([idx, rows]) => {
                if (idx !== this.counter) return;
                this._addRows(rows);
            })
            .catch((idx) => {
                if (idx !== this.counter) return;
                this.onError();
            });

        let leftRowCount = this.rowCount - this.currPage * this.props.pageSize
        this.currPageSize = Math.min(this.props.pageSize, leftRowCount);

        this._updateNav();
    }

    _updateNav() {
        this.tag.replaceChild(this._buildNav(), this.tag.querySelector('.table-nav'));
    }

    _addRows(rows) {
        this.loader.hide();
        const body = this.tag.querySelector('tbody');

        rows.forEach(row => {
            let rowTag = row.build(this.props.align);
            body.appendChild(rowTag);
        });
    }

    onEmpty() {
        this.loader.hide();
        this.wrapperTag.innerHTML += `
            <div class='abs-ctr empty-state'>
                <img src='/assets/icons/whoops.svg' alt="table error">
                <h3>Whoops!</h3>
                <p>No data available at the moment</p>
            <div>
        `;
    }

    onError() {
        this.loader.hide();
        this.wrapperTag.innerHTML += `
            <div class='abs-ctr empty-state'>
                <img src='/assets/icons/whoops.svg' alt="table error">
                <h3>Whoops!</h3>
                <p>Something went wrong on the server</p>
            <div>
        `;
    }

    clear() {
        this.tag.querySelector('.empty-state')?.remove();
        this.tag.querySelector('tbody').innerHTML = '';
        this.loader.show();
    }

    _build() {
        let table = document.createElement('div');
        table.classList.add('table');
        table.appendChild(this._buildWrapper());
        return table;
    }

    _buildWrapper() {
        let headerRow = this.columns.map(
            (label, i) => `<th style="text-align: ${this.props.align[i]}">${label}</th>`
        ).join('');

        let wrapper = document.createElement('div');
        wrapper.classList.add('table-wrapper');
        wrapper.innerHTML = `
            <table>
                <thead><tr>${headerRow}</tr></thead>
                <tbody></tbody>
            </table>
        `;
        return wrapper;
    }

    _buildNav() {
        let firstRowIdx = this.currPage * this.props.pageSize + 1;
        let lastRowIdx = firstRowIdx + this.currPageSize - 1;

        let range = document.createElement('p');
        range.classList.add('table-nav-range');
        range.innerText = `${firstRowIdx} - ${lastRowIdx} of ${this.rowCount} items`;

        let nav = document.createElement('div');
        nav.classList.add('table-nav');

        nav.appendChild(range);
        nav.appendChild(this._buildNavButtons());

        return nav;
    }

    _buildNavButtons() {
        let buttons = document.createElement('div');
        buttons.classList.add('table-nav-buttons');

        // first page
        if (this.currPage != 0) {
            buttons.appendChild(this._buildFirstPageButton());
        }

        // prev pages
        if (this.currRange > 0) {
            buttons.appendChild(this._buildPrevPagesButton());
        }

        // page buttons
        this._buildNumberedPagesButtons()
            .forEach(button => buttons.appendChild(button));

        // next pages
        if (this.currRange < this.rangeCount - 1) {
            buttons.appendChild(this._buildNextPagesButton());
        }

        // last page
        if (this.currPage != this.pageCount - 1) {
            buttons.appendChild(this._buildLastPageButton());
        }

        return buttons;
    }

    _buildNumberedPagesButtons() {
        let prevPageCount = this.currRange * this.props.rangeSize

        let rangeSize = Math.min(this.props.rangeSize, this.pageCount - prevPageCount);
        let pageNums = Array.from({ length: rangeSize }, (_, i) => i + prevPageCount);

        return pageNums.map(num => this._builtNumberedPageButton(num));
    }

    _builtNumberedPageButton(num) {
        let button = document.createElement('button');
        button.innerText = num + 1;
        button.onclick = () => {

            if (this.currPage == num)
                return;

            this.currPage = num;
            this._loadPage();
        };

        if (num == this.currPage)
            button.classList.add('active');

        return button;
    }

    _buildFirstPageButton() {
        let btn = document.createElement('button');
        btn.innerHTML = `<img src='/assets/icons/nav/first.svg' alt='first page'/>`;
        btn.onclick = () => {
            this.currRange = 0;
            this.currPage = 0;
            this._loadPage();
        };
        return btn;
    }

    _buildPrevPagesButton() {
        let btn = document.createElement('button');
        btn.innerText = '...';
        btn.onclick = () => {
            this.currRange -= 1;
            this.currPage = this.currRange * this.props.rangeSize + this.props.rangeSize - 1;
            this._loadPage();
        };
        return btn;
    }

    _buildNextPagesButton() {
        let btn = document.createElement('button');
        btn.innerText = '...';
        btn.onclick = () => {
            this.currRange += 1;
            this.currPage = this.currRange * this.props.rangeSize;
            this._loadPage();
        };
        return btn;
    }

    _buildLastPageButton() {
        let btn = document.createElement('button');
        btn.innerHTML = `<img src='/assets/icons/nav/last.svg' alt='last page'/>`;
        btn.onclick = () => {
            this.currRange = this.rangeCount - 1;
            this.currPage = this.pageCount - 1;
            this._loadPage();
        };
        return btn;
    }
}

/* props: color */
export class Row {
    constructor(cells, props) {
        this.cells = cells;
        this.props = props ?? {};
    }

    build(align) {
        let row = document.createElement('tr');

        if (this.props.color) {
            row.style.backgroundColor = this.props.color;
        }

        for (let i = 0; i < this.cells.length; i++) {
            let cell = this.cells[i].build(align[i]);
            row.appendChild(cell);
        }
        return row;
    }
}

/* props: onclick, color, max_width, min_width, class */
export class Cell {
    constructor(value, props) {
        this.value = value;
        this.props = props ?? {};
    }

    build(align) {
        let cell = document.createElement('td');

        if (this.props.onclick) {
            cell.onclick = this.props.onclick;
            cell.classList.add('link');
        }
        if (this.props.color) {
            cell.style.color = this.props.color;
        }
        if (this.props.max_width) {
            cell.style.maxWidth = this.props.max_width;
        }
        if (this.props.min_width) {
            cell.style.minWidth = this.props.min_width;
        }
        if (this.props.class) {
            cell.classList.add(this.props.class);
        }
        if (this.props.icon) {
            let img = document.createElement('img');

            img.src = this.props.icon;
            img.style.height = this.props.iconSize;
            img.alt = 'link';

            cell.appendChild(img);
        } else {
            cell.innerText = this.value
        }
        cell.style.textAlign = align;

        return cell;
    }
}