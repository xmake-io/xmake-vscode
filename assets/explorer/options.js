//@ts-check

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
    const vscode = acquireVsCodeApi();

    const oldState = vscode.getState() || { options: [] };

    let options = oldState.options || [];
    
    refresh(options);

    // Handle messages sent from the extension to the webview
    window.addEventListener('message', event => {
        const message = event.data; // The json data that the extension sent
        switch (message.type) {
            case 'options':
                {
                    refresh(message.data);
                    break;
                }
            }
        });
        
    // Recreate the options UI from the incoming options definition
    function refresh(new_options){

        // sort new options
        new_options.sort((a, b) => {
            if(a.name < b.name) return -1;
            else if(a.name > b.name) return 1;
            else return 0;
        })
        
        // store option so that web page can be re-loaded and refreshed
        options = new_options;
        vscode.setState({ options: new_options });

        // clear existing option inputs
        const optionsItem = document.getElementById('options');
        optionsItem.innerHTML = "";

        for(const option of options){
            
            // create the label
            const labelItem = document.createElement("label");
            labelItem.className = "options-label";
            labelItem.textContent = option.name;
            optionsItem.append(labelItem);

            const optionValues = findOptionValues(option.value.toString(), option.values);

            // create the value input
            // if there is a list of values then a drop down combo is used
            // otherwise a text input is used
            if(optionValues.length > 0)
            {
                // selection with combo
                const selectItem = document.createElement("select");
                selectItem.id = option.name + "Input";
                selectItem.oninput = onOptionsChange;
                
                for(let value of optionValues){
                    const optionElement = document.createElement("option");
                    optionElement.value = value;
                    optionElement.textContent = value;

                    if(option.value == value)
                        optionElement.selected = true;

                    selectItem.append(optionElement);
                }

                optionsItem.append(selectItem);
            }
            else
            {
                // no known values, use a text input
                const inputItem = document.createElement("input");
                inputItem.id = option.name + "Input";
                inputItem.type = "text";
                inputItem.value = option.value;
                inputItem.oninput = onOptionsChange;
                optionsItem.append(inputItem);
            }
        }
    }

    // options change event handler.
    // this is called whenever value of any option changes
    // read all the options and send them to the extension
    function onOptionsChange() {
        const optionValues = new Array();
        for(let option of options){
            const optionInput = document.getElementById(option.name + "Input");
            const optionValue = optionInput["value"];
            optionValues.push({name: option.name, value: optionValue});
            option.default = optionValue;
        }

        vscode.postMessage({type: "options", data: optionValues});

        vscode.setState({ options: options });
    }

    // Determine the list of option values depending on the user specified values and the default value
    // if the user has specified a list of values then use that list
    // If the default value is a known value (y,n,yes,no,true,false) then infer the possible values
    // Otherwise a list cannot be formed, a text input needs to be shown instead of a select.
    function findOptionValues(defaultValue, values){
        if(values != undefined && values.length > 0)
            return values;
        else if(defaultValue == 'y' || defaultValue == 'n')
            return ['y', 'n'];
        else if(defaultValue == 'yes' || defaultValue == 'no')
            return ['yes', 'no'];
        else if (defaultValue == 'true' || defaultValue == 'false')
            return ['true', 'false'];
        else
            return [];
    }

}());



