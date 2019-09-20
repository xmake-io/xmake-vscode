#include "dialogwithoutbuttonstest.h"
#include "ui_dialogwithoutbuttonstest.h"

DialogWithoutButtonsTest::DialogWithoutButtonsTest(QWidget *parent) :
    QDialog(parent),
    ui(new Ui::DialogWithoutButtonsTest)
{
    ui->setupUi(this);
}

DialogWithoutButtonsTest::~DialogWithoutButtonsTest()
{
    delete ui;
}
