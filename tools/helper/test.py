import xml.etree.ElementTree as ET
tree = ET.parse('mocha-junit-report.xml')
root = tree.getroot()

print (root)

# create empty list for news items
newsitems = []

# iterate news items
for failure in root.iter('failure'):
    print(root)
    print (failure.text)
