
(function() {
    var timeout = 50;
    var processed_key = 'unitprice_gkkfgadbepoc_processed';
    var price_unit = {}, money_unit = {};

    var box_filter = 'li, div.productItemBoxIn';

    var observer = new WebKitMutationObserver(function(mutations) {
        mutations.forEach(function(mutation) { 
            var box = $(mutation.target).closest(box_filter);
            if (box.length == 0) return;
            render_unit(box[0]);
        });
    });

    var rendered = {};

    var repeater = setTimeout(repeat, timeout);

    function repeat() {
        render(); 
        timeout *= 2;
        if (timeout > 1000) timeout = 1000;
        repeater = setTimeout(repeat, timeout);
    }

    $(function() { 
        render(); 
        clearTimeout(repeater);
    });

    function render() {
        $(box_filter).each(function (i, element) {
            var box = $(element);
            if (box.data(processed_key)) return;
            render_unit(element);
            observer.observe(element, { subtree: true, characterData: true });
        });
    }

    var regex_price = /([0-9.]+)/;
    function render_unit(element) {
        var box = $(element);

        var pictures = box.find('img');
        if (pictures.length != 1) return;
        
        var price = extract_price(box);
        if (!price) return;
            
        var weight_comp = extract_weight(box);
        if (!weight_comp || !weight_comp[0]) return;
        var weight = weight_comp[0];
        var unit = weight_comp[1];

        box.data(processed_key, 1);

        var unit_price = (price/weight);
        var unit_money = (weight/price);

        if (!price_unit[unit]) {
            if (unit_price > 1000) {
                price_unit[unit] = unit == 'Kg' ? 'g' : 'ml';
            } else {
                price_unit[unit] = unit;
            }

            if (unit_money < 1) {
                money_unit[unit] = unit == 'Kg' ? 'g' : 'ml';
            } else {
                money_unit[unit] = unit;
            }
        }
        if (price_unit[unit] == 'g' || price_unit[unit] == 'ml') { unit_price /= 1000; }
        if (money_unit[unit] == 'g' || money_unit[unit] == 'ml') { unit_money *= 1000; }
        unit_price = unit_price.toFixed(2);
        unit_money = unit_money.toFixed(2);

        box.find('div.unitprice_gkkfgadbepoc_box').remove();
        var price_box = $('<div class="unitprice_gkkfgadbepoc_box">').text(
            chrome.i18n.getMessage("price_report", [weight, price, unit_price, price_unit[unit], unit_money, money_unit[unit]])
        );
        price_box.attr('title', chrome.i18n.getMessage("price_title", [weight.toFixed(3), unit]));
        box.prepend(price_box);        
    }

    function extract_price(box) {
        var price_box = box.find('strong');
        if (price_box.length != 1) return null;

        var price = price_box.text();
        var price_match = regex_price.exec(price);
        if (!price_match) return null;
        return price_match[1];
    }

    // Example:
    // 雀巢 醇品速溶咖啡500g/罐
    // 雀巢 咖啡1加2特浓条装13g*（38+5）包/盒熬夜提升
    // 麓芭佰 昆仑山和田玉枣五星500g 2012新货
    // 熊猫伯伯 天然营养套餐 四星和田枣500g+黑加仑葡萄干260g

    var regex_add = /[(（](\s*\d+\s*((?:[+＋])\s*\d+\s*)+)[)）]/;
    function extract_weight(box) {
        var desc = '';
        box.find('a').each(function (i, elem) {
            desc += $(elem).text() + '\n';
        });


        var danger = 0;
        desc = desc.replace(regex_add, function(whole, substring) {
            var sum = 0;
            substring.split(/[+＋]/).forEach(function (atom) {
                var value = parseInt(atom);
                if (value != NaN) { sum += value; } else { danger = 1; }
            });
            return sum;
        });
        if (danger) return;

        var weight = 0;
        var weight_unit;
        desc.split(/\+/).forEach(function (phrase) {
            var weight_comp = extract_weight_phrase(phrase);
            if (!weight_comp) return;
            weight += weight_comp[0];
            weight_unit = weight_comp[1]; 
        });

        if (!weight) return;

        return [weight, weight_unit];
    }

    var regex_package = /([0-9.]+)\s*(?:(千克|公斤|kg)|(克|g)|(斤)|(两|両|兩)|(毫升|ml|cc)|(升|L))(?:\s*?(?:[x*\/ ]|\/\s*.{0,2}\s*[x*])\s*([0-9]{1,3})(?![0-9])(?:.{0,2}\s*[x*]\s*([0-9]{1,3})(?![0-9]))?)?/i;
    function extract_weight_phrase(phrase) {
        // Quantity*Weight? Reverse
        phrase = phrase.replace(/([0-9]+)[\*x]([0-9.]+((?:(千克|公斤|kg)|(克|g)|(斤)|(两|両|兩)|(毫升|ml|cc)|(升|L))))/, "$2*$1")

        var desc_match = regex_package.exec(phrase);
        if (desc_match == null) return null;

        var weight_in_unit = desc_match[1];
        var weight_unit = 
            desc_match[2] ? 1 :
            desc_match[3] ? 0.001 :
            desc_match[4] ? 0.5 :
            desc_match[5] ? 0.05 :
            desc_match[6] ? 0.001 :
            desc_match[7] ? 1 :
            1;

        var unit = desc_match[6] || desc_match[7] ? 'L' : 'Kg';

        var multiplier = desc_match[8] ? desc_match[8] : 1;
        if (desc_match[9]) multiplier *= desc_match[9];

        return [weight_in_unit * weight_unit * multiplier, unit];
    }
})();
